import type { Schema, Struct } from '@strapi/strapi';

export interface EditorialBriefItem extends Struct.ComponentSchema {
  collectionName: 'components_editorial_brief_items';
  info: {
    description: 'One slot in a daily brief (development, fact-check, or explainer)';
    displayName: 'Brief item';
  };
  attributes: {
    articleLink: Schema.Attribute.Relation<'oneToOne', 'api::article.article'>;
    summary: Schema.Attribute.Text & Schema.Attribute.Required;
    title: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface EditorialExhibitReference extends Struct.ComponentSchema {
  collectionName: 'components_editorial_exhibit_references';
  info: {
    description: 'Place an additional chart-exhibit inline within an article body';
    displayName: 'Exhibit reference';
  };
  attributes: {
    exhibit: Schema.Attribute.Relation<
      'oneToOne',
      'api::chart-exhibit.chart-exhibit'
    >;
  };
}

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

export interface EditorialSourceNote extends Struct.ComponentSchema {
  collectionName: 'components_editorial_source_notes';
  info: {
    description: 'One citation entry under a data-led article';
    displayName: 'Source note';
  };
  attributes: {
    text: Schema.Attribute.String & Schema.Attribute.Required;
    url: Schema.Attribute.String;
  };
}

export interface EditorialSummaryBullet extends Struct.ComponentSchema {
  collectionName: 'components_editorial_summary_bullets';
  info: {
    description: "One bullet in an article's executive summary";
    displayName: 'Summary bullet';
  };
  attributes: {
    text: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

declare module '@strapi/strapi' {
  export module Public {
    export interface ComponentSchemas {
      'editorial.brief-item': EditorialBriefItem;
      'editorial.exhibit-reference': EditorialExhibitReference;
      'editorial.explainer': EditorialExplainer;
      'editorial.pull-quote': EditorialPullQuote;
      'editorial.section-block': EditorialSectionBlock;
      'editorial.source-note': EditorialSourceNote;
      'editorial.summary-bullet': EditorialSummaryBullet;
    }
  }
}
