export default {
  routes: [
    {
      method: 'POST',
      path: '/tips/create',
      handler: 'api::tip.create-tip.createTip',
      config: {
        auth: false,
        policies: [],
        middlewares: [],
      },
    },
  ],
};
