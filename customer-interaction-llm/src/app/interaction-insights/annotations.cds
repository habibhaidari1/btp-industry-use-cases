using AdminService as service from '../../srv/admin-service';

annotate service.InteractionInsight with {
    ID            @ID   : 'ID';
    title         @title: 'Title';
    summary       @title: 'Description';
    createdAt     @title: 'Creation Date';
    priority_code @title: 'Priority';
    status        @title: 'Status';
    category      @title: 'Category';
    impact        @title: 'Impact';
    riskyear      @title: 'Year';
};

annotate service.InteractionInsight with @(
    Common.SemanticKey: [ID],
    UI                : {
        Identification  : [{Value: ID}],
        SelectionFields : [
            ID,
            status_code,
            category_code,
            summary
        ],
        LineItem #list01: [
            {
                $Type            : 'UI.DataField',
                Value            : title,
                ![@UI.Importance]: #High,
            },
            {
                $Type            : 'UI.DataField',
                Value            : summary,
                ![@UI.Importance]: #High,
            },
            {
                $Type            : 'UI.DataField',
                Value            : createdAt,
                ![@UI.Importance]: #High,
            },
            {
                $Type            : 'UI.DataField',
                Value            : priority_code,
                ![@UI.Importance]: #High,
            }
        ]
    }
);

annotate service.InboundCustomerMessage with @(UI: {
    PresentationVariant #chart03: {Visualizations: ['@UI.Chart#chart03', ], },
    Chart #chart03              : {
        ChartType          : #Column,
        Dimensions         : [intent_code],
        DimensionAttributes: [{
            Dimension: intent_code,
            Role     : #Category
        }],
        Measures           : [numberOfInboundCustomerMsgs],
        MeasureAttributes  : [{
            Measure: numberOfInboundCustomerMsgs,
            Role   : #Axis1
        }]
    }
});

annotate service.InteractionInsight with @(UI: {
    PresentationVariant #chart01: {Visualizations: ['@UI.Chart#chart01', ], },
    Chart                       : {
        ChartType          : #Column,
        Dimensions         : [StatusTxt],
        DimensionAttributes: [{
            Dimension: StatusTxt,
            Role     : #Category
        }],
        Measures           : [numberOfInteractions],
        MeasureAttributes  : [{
            Measure: numberOfInteractions,
            Role   : #Axis1
        }]
    },
    Chart #chart01              : {
        ChartType          : #Column,
        Dimensions         : [priority_code],
        DimensionAttributes: [{
            Dimension: priority_code,
            Role     : #Category
        }],
        Measures           : [numberOfInteractions],
        MeasureAttributes  : [{
            Measure: numberOfInteractions,
            Role   : #Axis1
        }]
    },
    HeaderInfo                  : {
        TypeName      : '{i18n>Message}',
        TypeNamePlural: '{i18n>Messages}',
        Title         : {Value: Aedate},
        Description   : {Value: Aedate}
    },
    Facets                      : [{
        $Type : 'UI.ReferenceFacet',
        Label : '{i18n>Details}',
        Target: '@UI.FieldGroup#Details'
    }, ],
    FieldGroup #Details         : {Data: [
        {Value: Pointer},
        {Value: Aedate},
        {Value: Status},
        {Value: StatusTxt},
        {Value: PriorityTxt},
        {Value: numberOfInteractions}

    ]}
});

annotate service.InteractionInsight with @(UI: {
    PresentationVariant #chart02: {Visualizations: ['@UI.Chart#chart02', ], },
    Chart #chart02              : {
        ChartType          : #Donut,
        Dimensions         : [priority_code],
        DimensionAttributes: [{
            Dimension: priority_code,
            Role     : #Category
        }],
        Measures           : [numberOfInteractions],
        MeasureAttributes  : [{
            Measure: numberOfInteractions,
            Role   : #Axis1
        }]
    }
});

annotate service.InteractionInsight with @(UI: {
    PresentationVariant #chart04: {Visualizations: ['@UI.Chart#chart04', ], },
    Chart #chart04              : {
        ChartType          : #Donut,
        Dimensions         : [category_code],
        DimensionAttributes: [{
            Dimension: category_code,
            Role     : #Category
        }],
        Measures           : [numberOfInteractions],
        MeasureAttributes  : [{
            Measure: numberOfInteractions,
            Role   : #Axis1
        }]
    }
});

annotate service.InboundCustomerMessage with @(UI: {
    PresentationVariant #chart05: {Visualizations: ['@UI.Chart#chart05', ], },
    Chart #chart05              : {
        ChartType          : #Donut,
        Dimensions         : [sentiment],
        DimensionAttributes: [{
            Dimension: sentiment,
            Role     : #Category
        }],
        Measures           : [numberOfInboundCustomerMsgs],
        MeasureAttributes  : [{
            Measure: numberOfInboundCustomerMsgs,
            Role   : #Axis1
        }]
    }
});

annotate service.InteractionInsight with @(UI: {
    PresentationVariant #chart06: {Visualizations: ['@UI.Chart#chart06', ], },
    Chart #chart06              : {
        ChartType          : #Bar,
        Dimensions         : [customer_ID],
        DimensionAttributes: [{
            Dimension: customer_ID,
            Role     : #Category
        }],
        Measures           : [numberOfInteractions],
        MeasureAttributes  : [{
            Measure: numberOfInteractions,
            Role   : #Axis1
        }]
    }
});
