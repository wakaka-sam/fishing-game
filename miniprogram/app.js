App({
  onLaunch() {
    if (wx.showShareMenu) {
      wx.showShareMenu({ withShareTicket: true });
    }
  },
});
