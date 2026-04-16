import { factories } from '@strapi/strapi';

type TipRequestBody = {
  authorDocumentId?: string;
  articleDocumentId?: string;
  amount?: number;
  currency?: string;
  message?: string;
};

type AuthorRecord = {
  documentId: string;
  earnings?: number | string;
};

export default factories.createCoreController('api::tip.tip', ({ strapi }) => ({
  async createTip(ctx) {
    const { authorDocumentId, articleDocumentId, amount, currency, message } =
      (ctx.request.body ?? {}) as TipRequestBody;

    if (!authorDocumentId || !articleDocumentId || !amount || !currency) {
      return ctx.badRequest('Missing required fields');
    }

    const tip = await strapi.documents('api::tip.tip').create({
      data: {
        author: authorDocumentId,
        article: articleDocumentId,
        amount,
        currency,
        message,
      },
    });

    const author = (await strapi.documents('api::author.author').findOne({
      documentId: authorDocumentId,
    })) as AuthorRecord | null;
    const newEarnings = Number(author?.earnings ?? 0) + Number(amount);
    await strapi.documents('api::author.author').update({
      documentId: authorDocumentId,
      data: { earnings: newEarnings },
    });

    ctx.body = tip;
  },
}));
