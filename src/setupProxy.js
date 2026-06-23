const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function (app) {
  app.use(
    '/api/lostark',
    createProxyMiddleware({
      target: 'https://developer-lostark.game.onstove.com',
      changeOrigin: true,
      pathRewrite: { '^/api/lostark': '' },
      onProxyReq: (proxyReq) => {
        proxyReq.setHeader('authorization', `bearer ${process.env.LOSTARK_API_KEY}`);
        proxyReq.setHeader('accept', 'application/json');
      },
    })
  );
};
