(function (win, fn) {
  'use strict';

  var returnVal = fn();

  for (var k in returnVal) {
    win[k] = returnVal[k];
  }

}(this, function () {
  var $uiPopup = $('#ui-popup'),
    $uiPopupContent = $('#ui-popup-content'),
    $viewerContainer = $('#viewerContainer'),
    $slade = $('#slade'),
    $multiSignPad = $('#multisignpad'),
    $multiSignPadShow = $('#multisignpadshow');

  var $tplPopup = $('#tpl-uipopup').html();

  function init() {
    initListener();
  }

  function initListener() {
    $viewerContainer.on('click', 'section[data-annotation-id]', function () {
      var id = $(this).attr('data-annotation-id'),
        signData = window.responseSignData || [];

      if (signData.length < 1) {
        alert('暂无此签章信息');
        return;
      }

      $.each(signData, function (i, e) {
        if (e.id == id) {
          var cert = e.cert;

          if (e.isIntegrity) {
            e.signCls = 'success';
            e.signDescription = '签名有效，由"' + cert.signer +
              '"签名，自应用本签名以来，"文档"未被修改';
          } else {
            e.signCls = 'error';
            e.signDescription = '签名无效，由"' + cert.signer +
              '"签名，自应用本签名以来，"文档"已被更改或损坏';
          }

          var blob = base64ToBlob(cert.base64Cert);

          cert.certDownloadUrl = window.URL.createObjectURL(blob);
          e.signdate = getDate(e.signdate);

          $uiPopupContent.html(Mustache.render($tplPopup, e));
          $uiPopup.addClass('zoomIn animated faster');
          $uiPopup.removeClass('hidden');
          window.URL.revokeObjectURL(blob);
        }
      });
    });

    $('#multi-sign').on('click', function() {
        $slade.show();
        $multiSignPad.css("display", "block");
        $multiSignPadShow.append("<img src='company.png' />");
    });
  }

  function getDate(millisecond) {
    var date = new Date(millisecond);

    return date.getFullYear() + '-' + appendZero(date.getMonth() + 1) + '-' +
      appendZero(date.getDate()) + ' ' + appendZero(date.getHours()) + ':' +
      appendZero(date.getMinutes()) + ':' + appendZero(date.getSeconds());
  }

  function appendZero(sum) {
    if (sum < 10) {
      return '0' + sum;
    }

    return sum;
  }

  function base64ToBlob(b64) {
    // 解码 b64 并且转换成 btype
    // 注意，这边 atob 必须解码的是没有 url 部分的 base64 值，如果带有 url 部分，解码会报错！
    var btypes = window.atob(b64);

    // 处理异常，将ascii码小于0的转换为大于0
    var ab = new ArrayBuffer(btypes.length);
    // 生成视图（直接针对内存）：8位无符号整数，长度1个字节
    var ia = new Uint8Array(ab);

    for (var i = 0, len = btypes.length; i < len; i++) {
      ia[i] = btypes.charCodeAt(i);
    }

    return new Blob([ab], {
      type: 'application/x-x509-ca-cert'
    });
  }

  init();
}));
