export default {
  routes: [
    {
      method: 'POST',
      path: '/articles/:documentId/increment-view',
      handler: 'api::article.increment-view.incrementView',
      config: {
        auth: false,
        policies: [],
        middlewares: [],
      },
    },
  ],
};
