import type { Schema, Struct } from '@strapi/strapi';

export interface EditorialExplainer extends Struct.ComponentSchema {
  collectionName: 'components_editorial_explainers';
  info: {
    description: 'Context box with key takeaways';
    displayName: 'Explainer';
  };
  attributes: {
    body: Schema.Attribute.Text & Schema.Attribute.Required;
    keyPoints: Schema.Attribute.JSON & Schema.Attribute.Required;
    title: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface EditorialPullQuote extends Struct.ComponentSchema {
  collectionName: 'components_editorial_pull_quotes';
  info: {
    description: 'Highlighted quote within an article';
    displayName: 'Pull quote';
  };
  attributes: {
    attribution: Schema.Attribute.String & Schema.Attribute.Required;
    quote: Schema.Attribute.Text & Schema.Attribute.Required;
    role: Schema.Attribute.String;
  };
}

export interface EditorialSectionBlock extends Struct.ComponentSchema {
  collectionName: 'components_editorial_section_blocks';
  info: {
    description: 'Rich section content inside an article';
    displayName: 'Section block';
  };
  attributes: {
    body: Schema.Attribute.RichText & Schema.Attribute.Required;
    heading: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

declare module '@strapi/strapi' {
  export module Public {
    export interface ComponentSchemas {
      'editorial.explainer': EditorialExplainer;
      'editorial.pull-quote': EditorialPullQuote;
      'editorial.section-block': EditorialSectionBlock;
    }
  }
}
