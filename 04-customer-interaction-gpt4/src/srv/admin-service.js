const cds = require("@sap/cds/lib");
const e = require("express");
const orchestratorService = require("./orchestrator-service");

module.exports = class AdminService extends cds.ApplicationService {
  init() {
    const {
      CustomerInteraction,
      InboundCustomerMessage,
      InboundCustomerMessageIntent,
      OutboundServiceMessage,
      Contact,
    } = this.entities;

    this.before(["NEW"], [CustomerInteraction, Contact], genid);
    this.before(["CREATE"], [Contact], genid);
    this.before(
      ["NEW", "CREATE"],
      [InboundCustomerMessage, OutboundServiceMessage],
      genseq
    );

    /**
     * Handler of on creating an customer interaction with an inbound customer message
     * 1.invoke the llm-proxy to perform sentiment analysis, text summarisation
     * and entity extraction on the text message on inbound customer message
     * 2.update the sentiment on the InboundCustomerMessage instance.
     * 3.update the title and summary on CustomerInteraction
     */
    this.before(["CREATE"], CustomerInteraction, async (req) => {
      //prepare the default value for CustomerInteraction
      //generate the next ID if missing
      //if (typeof req.data.ID === "undefined") 
      await genid(req);

      //Generate external reference no.
      req.data.extRef = generateExtRef();

      //set default status as New if missing
      if (
        typeof req.data.status_code === "undefined" ||
        req.data.status_code.length === 0
      )
        req.data.status_code = "NW";

      //set default priority as Medium if missing
      if (
        typeof req.data.priority_code === "undefined" ||
        req.data.priority_code.length === 0
      )
        req.data.priority_code = "M";

      if (
        !req.data.inboundMsgs ||
        !Array.isArray(req.data.inboundMsgs) ||
        req.data.inboundMsgs.length === 0
      ) {
        //If no inboundMsgs provided in the payload, then skip preparing inbound customer message
        return req.data;
      }

      //set default channel as WEB if missing
      if (
        typeof req.data.inboundMsgs[0].channel_code === "undefined" ||
        req.data.inboundMsgs[0].channel_code.length === 0
      )
        req.data.inboundMsgs[0].channel_code = "WEB";

      //replicate the channel code from inbound customer message to customer interaction
      req.data.originChannel_code = req.data.inboundMsgs[0].channel_code;

      const inMsgs = req.data.inboundMsgs.map((msg) => msg.inboundTextMsg);
      //if no text message derived from inbound customer message, then skip invoke LLM
      if (typeof inMsgs[0] === 'undefined' || inMsgs[0].length === 0)
        return req.data;

      const inboundText = { text: inMsgs[0] };
      const LlmProxyService = await cds.connect.to("LlmProxyService");

      //Invoke the LLM proxy to process the current inbound customer message.
      const result = await LlmProxyService.processCustomerMessage(inboundText);
      //reflect the summarised title to the inbound customer message
      req.data.summary = result.data.summary;
      req.data.title = result.data.title;
      req.data.inboundMsgs[0].summary = result.data.title;
      if (result.data.sentiment) {
        req.data.inboundMsgs[0].sentiment = result.data.sentiment;
        if (result.data.sentiment === "Positive") {
          //complement
          req.data.inboundMsgs[0].type_code = "CL";
        } else if (result.data.sentiment === "Negative") {
          //complement
          req.data.inboundMsgs[0].type_code = "CM";
        } else {
          //information
          req.data.inboundMsgs[0].type_code = "IN";
        }
      }
      //embedding the text of incoming customer message to vector.
      //and to be stored into IncomingCustomerMessage.vector field
      //will be used for classifying the intents of the text
      // const embedding = await LlmProxyService.embedding(inboundText);
      // req.data.inboundMsgs[0].embedding = embedding;

      //Classify the intent for the message intent with embedding and similarity search
      const intentCode = await LlmProxyService.zeroShotClassification(inboundText)
      req.data.inboundMsgs[0].intent_code = intentCode;

      return req.data;
    });

    /**
     * Handler of after creating an customer interaction with an inbound customer message
     * 1.invoke the ochestrator-service to handle the message
     * 2.Create an OutboundServiceMessage instance to reply the message
     */
    this.after(["CREATE"], InboundCustomerMessage, async (req) => {

      /**
       * [Completed] 
       * - Code to Intent > BR API to retrieve Action i.e. CA = CRM-Complaint
       * - Action to Create Service Call in FSM
       * 
       * [To-Do]
       * - Decouple function to orchestrator service for cleaner codebase
       * - Figure out POST to OutboundServiceMessage
       */
      const BR = await cds.connect.to('BR');
      const FSM = await cds.connect.to('FSM');

      //Invoke the LLM proxy to process the current inbound customer message.
      console.log(JSON.stringify(req));
      // const result = await orchestratorService.handelMessageV2(req);
      // const CTC_resp = await CTC.post("/int-ticket/handelMessageV2", CTC_payload);
      //Create OutboundServiceMessage instance. with result complaint#....

      const classification = req.intent_code;

      // Call Business Rules API passing the classification and retreive the route
      const BR_payload = {
        RuleServiceId: "3a4e53b84c8e4313bc6d7922ade85809",
        RuleServiceRevision: "1",
        Vocabulary: [
          {
            Classification: classification
          }
        ]
      };
      const BR_resp = await BR.post("/rules-service/rest/v2/rule-services", BR_payload);
      const action = BR_resp.Result[0].Route.Action;

      console.log(action);

      // If action is "CRM" then a service request must be created
      let code = "";
      if (action === "CRM-Complaint") {
        const FSM_payload = {
          leader: null,
          subject: req.summary,
          chargeableEfforts: false,
          project: null,
          owners: null,
          objectGroup: null,
          resolution: null,
          syncObjectKPIs: null,
          inactive: false,
          partOfRecurrenceSeries: null,
          contact: "D0725AA6243A4470A49C0052232CA898",
          problemTypeName: null,
          originCode: "-1",
          problemTypeCode: null,
          changelog: null,
          endDateTime: "2023-12-31T09:00:00Z",
          priority: (classification.toLocaleLowerCase() === "complaint") ? "HIGH" : "LOW",
          branches: null,
          salesOrder: null,
          dueDateTime: "2023-12-31T22:59:00Z",
          salesQuotation: null,
          udfMetaGroups: null,
          orderReference: null,
          responsibles: [
            "14523B3D57424338858CB56BBF120696"
          ],
          syncStatus: "IN_CLOUD",
          statusCode: "-2",
          businessPartner: "8FA7D41CD4C448BF9A27962E9055C141",
          projectPhase: null,
          technicians: [],
          typeName: "Unplanned",
          chargeableMileages: false,
          orgLevel: null,
          chargeableMaterials: false,
          statusName: "Ready to plan",
          orderDateTime: null,
          chargeableExpenses: false,
          lastChanged: 1544172897151,
          durationInMinutes: null,
          serviceContract: null,
          createPerson: "14523B3D57424338858CB56BBF120696",
          externalId: null,
          groups: null,
          team: null,
          typeCode: "-1",
          equipments: [
            "3B981A0D8206421393DB124C2430F95E"
          ],
          startDateTime: "2022-12-09T08:00:00Z",
          location: null,
          udfValues: null,
          incident: null,
          remarks: null,
          originName: "Intelligent Ticket System"
        };
        const headers = {
          "X-Client-ID": "DemoClient",
          "X-Client-Version": "1.0",
          "X-Account-ID": 96388,
          "X-Company-ID": 108432

        };
        const FSM_resp = await FSM.send("POST", "/ServiceCall/?dtos=ServiceCall.26", FSM_payload, headers);
        code = FSM_resp.data[0].serviceCall.code;
      }

      // Configure reply message accourding to route
      const replyMessage = (action === "CRM-Complaint") ? 'Thank you for reaching out. A service call for your ' + classification.toLocaleLowerCase() + ' with code "' + code + '" has been created in our system. A representative will contact you soon.' : "Thank you for appreciating our service. We hope to keep always satisfying your expectations!";

      // Respond to the requester
      const res = {
        type: classification,
        route: action,
        replyMessage: replyMessage,
        code: code
      };

      console.log(res);

      return res;

      // return result.data;
    });

    /**
     * Handler of on creating an inbound customer message
     * 1.invoke the llm-proxy to perform sentiment analysis,
     * text summarisation and entity extraction
     * 2.update the sentiment on the InboundCustomerMessage instance.
     * 3.update the title and summary on parent object CustomerInteraction
     */
    this.on(["CREATE"], InboundCustomerMessage, async (req) => {
      const inboundTextMsgs = await cds
        .tx(req)
        .run(
          SELECT.from(InboundCustomerMessage)
            .columns("inboundTextMsg")
            .where("interaction_ID=", req.data.interaction_ID)
        );
      let inMsgs = inboundTextMsgs.map((msg) => msg.inboundTextMsg);
      //at this point, the new record hasn't hit the database.
      //so add the new instance of InboundCustomerMessage to the list.
      //sum up all the inbound customer messages, and
      inMsgs.push(req.data.inboundTextMsg);
      const allInboundText = { text: inMsgs.join("\n") };
      const LlmProxyService = await cds.connect.to("LlmProxyService");
      //Invoke the LLM proxy to summarise all the inbound customer messages of the interaction instance.
      //which will be used update the title and summary of CustomerInteraction instance
      const summaryResult = await LlmProxyService.summarise(allInboundText);

      //Invoke the LLM proxy to process the current inbound customer message.
      const message = { text: req.data.inboundTextMsg }
      const result = await LlmProxyService.processCustomerMessage(
        //req.data.inboundTextMsg
        message
      );
      //reflect the summarised title to the inbound customer message
      req.data.summary = result.data.title;
      if (result.data.sentiment) {
        req.data.sentiment = result.data.sentiment;
        if (result.data.sentiment === "Positive") {
          //complement
          req.data.type_code = "CL";
        } else if (result.data.sentiment === "Negative") {
          //complement
          req.data.type_code = "CM";
        } else {
          //information
          req.data.type_code = "IN";
        }
      }
      req.data.intname = result.data.sentiment;

      //embedding the text of incoming customer message to vector.
      //and to be stored into IncomingCustomerMessage.vector field
      //will be used for classifying the intents of the text
      // const embedding = await LlmProxyService.embedding(
      //   req.data.inboundTextMsg
      // );
      // req.data.embedding = embedding;

      //Classify the intent for the message intent with embedding and similarity search
      const intentCode = await LlmProxyService.zeroShotClassification(message)
      req.data.intent_code = intentCode;

      //manual transaction
      cds.tx(async () => {
        await UPDATE(CustomerInteraction, req.data.interaction_ID).with({
          title: summaryResult.data.title,
          summary: summaryResult.data.summary,
        });
        await INSERT.into(InboundCustomerMessage, req.data);
      });

      return req.data;
    });

    /**
     * Handler of before creating an inbound customer message intent
     * 1.invoke the llm-proxy to perform embedding on the descr of
     * inbound customer message intent
     * 2.set the value for embedding field on inbound customer message intent
     */
    this.before(
      ["NEW", "CREATE"],
      InboundCustomerMessageIntent,
      async (req) => {
        //before NEW triggered by create button on UI.
        //at this moment, only key(code) is available, thus skip embedding
        //when it is POST http call or save from UI, before create will be triggered
        if (typeof req.data.descr === "undefined") return req.data;

        const descr = { text: req.data.descr };
        const LlmProxyService = await cds.connect.to("LlmProxyService");

        //embedding the description text of incoming customer message intent to vector.
        //and to be stored into IncomingCustomerMessageIntent.embedding field
        //will be used for classifying the intents of the inbound customer message
        const embedding = await LlmProxyService.embedding(descr);
        req.data.embedding = embedding;

        return req.data;
      }
    );

    return super.init();
  }
};

/** Generate primary keys for target entity in request */
async function genid(req) {
  const { ID } = await cds
    .tx(req)
    .run(SELECT.one.from(req.target).columns("max(ID) as ID"));
  req.data.ID = ID + 1;
}

async function genseq(req) {
  const { sequence } = await cds
    .tx(req)
    .run(
      SELECT.one
        .from(req.target)
        .columns("max(sequence) as sequence")
        .where({ interaction_ID: req.data.interaction_ID })
    );
  req.data.sequence = sequence + 1;
}

function generateExtRef() {
  const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < 8; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}
