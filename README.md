# B 站粉丝记录前端显示界面

## b-fans-record-front

### 使用方式

1. 部署[b-fans-record-server](https://github.com/aDm8H/b-fans-recorder-server)后端服务器.

2. 打开`index.local.html`即可显示实时粉丝量及趋势线

    前端会默认连接到`ws://127.0.0.1:12102`，如需自定义服务器，请在 URL 后手动加入参数`?ws=ws://地址:端口`.

3. `artist.html`是一个艺术化的简洁显示页面，使用方法同上。（为获得更佳的视觉效果，请先安装[得意黑](https://github.com/atelier-anchor/smiley-sans)字体）.
