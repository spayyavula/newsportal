import { factories } from '@strapi/strapi';

type ArticleWithAuthor = {
  documentId: string;
  views?: number;
  author?: { documentId: string; earnings?: number } | null;
};

type AuthorRecord = {
  documentId: string;
  earnings?: number | string;
};

export default factories.createCoreController('api::article.article', ({ strapi }) => ({
  async incrementView(ctx) {
    const { documentId } = ctx.params;

    const article = (await strapi.documents('api::article.article').findOne({
      documentId,
      populate: { author: true },
    })) as ArticleWithAuthor | null;

    if (!article) {
      return ctx.notFound('Article not found');
    }

    const newViews = (article.views ?? 0) + 1;
    await strapi.documents('api::article.article').update({
      documentId,
      data: { views: newViews },
    });

    const earningPerView = 0.001;
    if (article.author?.documentId) {
      const author = (await strapi.documents('api::author.author').findOne({
        documentId: article.author.documentId,
      })) as AuthorRecord | null;
      const newEarnings = Number(author?.earnings ?? 0) + earningPerView;
      await strapi.documents('api::author.author').update({
        documentId: article.author.documentId,
        data: { earnings: newEarnings },
      });
    }

    ctx.body = { views: newViews };
  },
}));
