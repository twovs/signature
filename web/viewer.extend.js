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
    $signPad = $('#signpad'),
    $singleSign = $('#single-sign'),
    $multiSign = $('#multi-sign'),
    $mainContainer = $('#mainContainer'),
    $contextmenu = $('#delsigndiv'),
    $signPadShow = $('#signpadshow');

  var $tplPopup = $('#tpl-uipopup').html();

  var isOpenSig = false, // 是否满足签章条件，并且点击了开始签章
    signSerial = 0,
    type = null, // 选择签章类型，0：签章(只能签一次，签一次这个按钮就消失了)，1：多页签章(可以签多个)
    signElArray = [];

  var sign_div,
      sign_img;

  var toolbarHeight = $('#toolbarContainer').height();

  function init() {
    initListener();
  }

  function initListener() {
    var offsetLeft,
      offsetTop;

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
    }).on('click', '.page', function () {
      var pageNumber = $(this).attr('data-page-number');
        

      // 如果开启了签章，并且已有pdf展示
      if (isOpenSig) {
        var left = parseInt($(sign_div).css('left')),
          top = parseInt($(sign_div).css('top'));

        var $curPageEl = $viewerContainer.find('[data-page-number="' +
            pageNumber + '"]'),
          div = document.createElement('div'),
          img = document.createElement('img'),
          $canvasWrapper = $(this).find('.canvasWrapper').height(),
          scale = PDFViewerApplication.toolbar.pageScale;

        div.id = '_signSerial' + signSerial;
        div.className = '_addSign';
        div.setAttribute('data-index', signSerial);
        img.src = sign_img.src;
        img.width = sign_img.width;
        img.height = sign_img.height;

        $(div).css({
          position: 'absolute',
          left: left + 'px',
          top: top + 'px'
        });

        $(div).append(img);
        $curPageEl.append(div);

        // 进行签章合并
        sendSignPdf({
          "sign": [{
            "name": 'sign' + parseInt((Math.random() * (Math.random() * 100000).toFixed(0)).toFixed(0), 10),
            "page": pageNumber,
            "llx": left / scale * 0.75,
            "lly": ($canvasWrapper - top - div.offsetHeight) / scale * 0.75,
            "urx": (left + div.offsetWidth) / scale * 0.75,
            "ury": ($canvasWrapper - top) / scale * 0.75
          }]
        });

        window.signElArray.push({
          pageNumber: pageNumber,
          signEl: div,
          scale: PDFViewerApplication.toolbar.pageScale,
          imgWidth: img.width,
          imgHeight: img.height,
          top: top,
          left: left,
          pageRotation: PDFViewerApplication.pageRotation
        });

        var movesign = $(this).find('.movesign');

        $.each(movesign, function (i, e) {
          e.remove();
        });

        sign_div = null;
        sign_img = null;
        isOpenSig = false;

        signSerial++;
      }
    }).on('mouseenter', '.page', function (e) {
      var $this = $(this);
      var pageX = e.pageX,
          pageY = e.pageY;

      offsetLeft = this.offsetLeft + $mainContainer.get(0).offsetLeft;
      offsetTop = this.offsetTop + $mainContainer.get(0).offsetTop;

      if (isOpenSig) {
        var top = pageY - offsetTop - sign_img.height / 2 + $viewerContainer.get(0).scrollTop - toolbarHeight,
          left = pageX - offsetLeft - sign_img.width / 2;

        $(sign_div).css({
          top: top + 'px',
          left: left + 'px'
        });

        $this.append(sign_div);
      }
    }).on('mousemove', '.page', function(e) {
      var pageX = e.pageX,
        pageY = e.pageY;

      offsetLeft = this.offsetLeft + $mainContainer.get(0).offsetLeft;
      offsetTop = this.offsetTop + $mainContainer.get(0).offsetTop;

      if (isOpenSig) {
        var top = pageY - offsetTop - sign_img.height / 2 + $viewerContainer.get(0).scrollTop - toolbarHeight,
          left = pageX - offsetLeft - sign_img.width / 2;

        $(sign_div).css({
          top: top + 'px',
          left: left + 'px'
        });
      }
    }).on('mouseleave', function (e) {
      var movesign = $(this).find('.movesign');

      $.each(movesign, function (i, e) {
        e.remove();
      });

      sign_div = null;
      sign_img = null;
      isOpenSig = false;
    }).on('contextmenu', '._addSign', function (e) {
      e.preventDefault();

      delSerial = $(this).data('index');

      $contextmenu.show();
      $contextmenu.css({
        top: e.pageY,
        left: e.pageX
      });
    });

    // 关闭签章区域
    var closeSignPad = function () {
      $signPadShow.find('img').remove();
      $signPad.hide();
      $slade.hide();
    };

    $signPad.on('click', 'input[type=button]', function () {
      var val = this.value;

      switch (val) {
        case '开始签章':
          if (PDFViewerApplication.pdfViewer.viewer.childNodes.length == 0) {
            isOpenSig = false;

            alert('请先打开需要签章的pdf文件');
          }
          else {
            var pageScale = PDFViewerApplication.toolbar.pageScale;

            sign_img = document.createElement('img');
            sign_div = document.createElement('div');

            sign_img.src = $signPadShow.find('img').prop('src');
            sign_img.onload = function () {
              $(sign_img).css({
                width: sign_img.width * pageScale,
                height: sign_img.height * pageScale
              });
            };

            sign_div.appendChild(sign_img);
            $(sign_div).addClass('movesign');
            $(sign_div).css({
              position: 'absolute',
              textAlign: 'center'
            });

            isOpenSig = true;
          }

          closeSignPad();
          break;

        case '清除重签':
          $viewerContainer.find('img').remove();
          break;

        case '关闭':
          closeSignPad();
          break;
      }
    });

    var signEvtCallback = function() {
      $slade.show();
      $signPad.css("display", "block");
      $signPadShow.append("<img src='./images/company.png' />");
    };

    // 单个签章
    $singleSign.on('click', function() {
      type = 0;

      signEvtCallback();
    });

    // 多页签章
    $multiSign.on('click', function() {
      type = 1;

      signEvtCallback();
    });

    $uiPopup.on('click', '.ui-popup-close', function () {
      $uiPopup.removeClass('zoomIn animated faster');
      $uiPopup.addClass('hidden');
    });

    $contextmenu.on('click', 'li', function () {
      $viewerContainer.find('[data-index="' + delSerial + '"]').remove();
      window.signElArray.splice(delSerial, 1, undefined);
      $contextmenu.hide();
    });
  }

  /**
   * 上传签章
   * @param {Object} params 请求参数
   */
  function sendSignPdf(params) {
    var type = epTools.type,
      msg = epTools.msg;

    var formData = new FormData();

    if (type == 'url') {
      params.pdf = {
        type: type,
        msg: msg
      };

      formData.append('signReq', JSON.stringify(params));
    }
    else if (type == 'file') {
      params.pdf = {
        type: type,
        msg: ''
      };

      formData.append('signReq', JSON.stringify(params));
      formData.append('file', msg);
    }

    $.ajax({
      url: signPdfUrl,
      data: formData,
      type: 'post',
      processData: false,
      contentType: false,
      dataType: 'json',
      success: function(res) {
        if (res.status == 'ok') {
          console.log('上传签章成功');
          console.log(res.msg);

          if (type == 0) {
            $singleSign.hide();
          }

          type = null;
        }
        else {
          console.error('上传签章失败');
          console.log(JSON.stringify(res));
        }
      },
      error: function() {
        console.error('上传签章失败');
      }
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

  return {
    signElArray: signElArray
  };
}));
