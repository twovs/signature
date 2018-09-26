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
    $sign = $('#sign'),
    $multiSign = $('#multi-sign'),
    $mainContainer = $('#mainContainer'),
    $contextmenu = $('#delsigndiv'),
    $signPadShow = $('#signpadshow');

  var $tplPopup = $('#tpl-uipopup').html();

  var isOpenSig = false, // 是否满足签章条件，并且点击了开始签章
    signSerial = 0,
    signStatus = null, // 选择签章类型，0：签章(只能签一次，签一次这个按钮就消失了)，1：多页签章(可以签多个)
    signElArray = [],
    initSignImgWidth = 0,
    initSignImgHeight = 0;

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
          scale = PDFViewerApplication.toolbar.pageScale,
          signName = 'Sign-' + uuidv4();

        div.id = '_signSerial' + signSerial;
        div.className = '_addSign';
        div.setAttribute('data-index', signSerial);
        div.setAttribute('data-signname', signName);
        img.src = sign_img.src;
        img.className = '_signimg';
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
            "name": signName,
            "page": pageNumber,
            "llx": left / scale * 0.75,
            "lly": ($canvasWrapper - top - div.offsetHeight) /
              scale * 0.75,
            "urx": (left + div.offsetWidth) / scale * 0.75,
            "ury": ($canvasWrapper - top) / scale * 0.75
          }]
        }, signName);

        signElArray.push({
          pageNumber: pageNumber,
          signName: signName,
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
        var top = pageY - offsetTop - sign_img.height / 2 +
          $viewerContainer.get(0).scrollTop - toolbarHeight,
          left = pageX - offsetLeft - sign_img.width / 2;

        $(sign_div).css({
          top: top + 'px',
          left: left + 'px'
        });

        $this.append(sign_div);
      }
    }).on('mousemove', '.page', function (e) {
      var pageX = e.pageX,
        pageY = e.pageY;

      offsetLeft = this.offsetLeft + $mainContainer.get(0).offsetLeft;
      offsetTop = this.offsetTop + $mainContainer.get(0).offsetTop;

      if (isOpenSig) {
        var top = pageY - offsetTop - sign_img.height / 2 +
          $viewerContainer.get(0).scrollTop - toolbarHeight,
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
    
    // 点击查找按钮
    $('#findBtn').on('click', function() {
      PDFViewerApplication && PDFViewerApplication.findBar.dispatchEvent('');
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
          if (PDFViewerApplication.pdfViewer.viewer.childNodes.length ==
            0) {
            isOpenSig = false;

            alert('请先打开需要签章的pdf文件');
          } else {
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

    var signEvtCallback = function () {
      $slade.show();
      $signPad.css("display", "block");
      $signPadShow.append("<img src='./images/company.png' />");
    };

    // 单个签章
    $sign.on('click', function () {
      signStatus = 0;

      signEvtCallback();
    });

    // 多页签章
    $multiSign.on('click', function () {
      signStatus = 1;

      signEvtCallback();
    });

    $uiPopup.on('click', '.ui-popup-close', function () {
      $uiPopup.removeClass('zoomIn animated faster');
      $uiPopup.addClass('hidden');
    });

    $contextmenu.on('click', 'li', function () {
      $viewerContainer.find('[data-index="' + delSerial + '"]').remove();
      signElArray.splice(delSerial, 1, undefined);
      $contextmenu.hide();
    });
  }

  /**
   * 创建uuid
   * @returns {String} uuid 唯一标识
   */
  function uuidv4() {
    return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
      (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
    )
  }

  /**
   * 上传签章
   * @param {Object} params 请求参数
   * @param {Object} signName 签章名字
   */
  function sendSignPdf(params, signName) {
    var type = epTools.type,
      msg = epTools.msg;

    var formData = new FormData();

    if (type == 'url') {
      params.pdf = {
        type: type,
        msg: msg
      };

      formData.append('signReq', JSON.stringify(params));
    } else if (type == 'file') {
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
      timeout: 5000,
      success: function (res) {
        if (res.status == 'ok') {
          if (signStatus == 0) {
            $sign.hide();
          }

          // 创建签章状态标识
          createSignStatusImg('success', signName, epTools.AfterSignPDF);
        } else {
          // 创建签章状态标识
          createSignStatusImg('error', signName, epTools.AfterSignPDF);
        }
      },
      error: function () {
        // 创建签章状态标识
        delSignStatus(signName, epTools.AfterDelSignature);
      },
      complete: function () {
        signStatus = null;
      }
    });
  }

  /**
   * 创建签章状态标识
   * @param {String} status 签章是否成功 success or error
   * @param {String} signName 签章标识
   * @param {Function} callback 执行回调函数
   */
  function createSignStatusImg(status, signName, callback) {
    var $signDiv = $viewerContainer.find('div[data-signname="' + signName +
      '"]');
    var img = document.createElement('img');
    var pageScale = PDFViewerApplication.toolbar.pageScale;

    img.src = status === 'success' ? './images/sign-check-48.png' : './images/sign-error-48.png';
    img.className = '_signstatus';

    img.onload = function () {
      initSignImgWidth = this.width * pageScale;
      initSignImgHeight = this.height * pageScale;

      $(this).css({
        width: initSignImgWidth,
        height: initSignImgHeight
      });
    };

    typeof callback === 'function' && callback.call(epTools);
    $signDiv.append(img);
    img = null;
  }

  /**
   * 签章请求接口超时失败的时候删除签章
   * @param {String} signName 签章标识名字
   * @param {Function} callback  签章失败删除签章回调函数
   */
  function delSignStatus(signName, callback) {
    $viewerContainer.find('div[data-signname="'+ signName +'"]').remove();
    
    $.each(signElArray, function(i, e) {
      if (e && e.signName == signName) {
        signElArray.splice(i, 1);
      }
    });

    typeof callback == 'function' && callback.call(epTools);
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

  // 渲染页面触发该事件
  var pageDrawCallback = function () {
    var scale = PDFViewerApplication.toolbar.pageScale,
      rotation = PDFViewerApplication.pageRotation;

    $.each(signElArray, function (i, e) {
      if (e) {
        var $el = $viewerContainer.find('[data-page-number="' + e.pageNumber +
            '"]'),
          signEl = e.signEl,
          initTop = e.top,
          initLeft = e.left,
          initImgWidth = e.imgWidth,
          initImgHeight = e.imgHeight,
          $signEl = $(signEl),
          $img = $signEl.find('._signimg'),
          $signimgStatus = $signEl.find('._signstatus'),
          width = initImgWidth,
          height = initImgHeight,
          top = initTop,
          left = initLeft;

        var canvasWidth = $el.find('.canvasWrapper').width(),
          canvasHeight = $el.find('.canvasWrapper').height();

        top = initTop / e.scale * scale;
        left = initLeft / e.scale * scale;
        width = initImgWidth / e.scale * scale;
        height = initImgHeight / e.scale * scale;

        $img.css({
          width: width,
          height: height
        });

        $signimgStatus.css({
          width: initSignImgWidth / e.scale * scale,
          height: initSignImgHeight / e.scale * scale
        });

        switch (rotation) {
          case 0:
            $signEl.css({
              top: top,
              left: left,
              bottom: 'auto',
              right: 'auto'
            });
            break;

          case 90:
            $signEl.css({
              top: left,
              left: 'auto',
              right: top,
              bottom: 'auto'
            });
            break;

          case 180:
            $signEl.css({
              top: 'auto',
              left: 'auto',
              bottom: top,
              right: left
            });
            break;

          case 270:
            $signEl.css({
              top: 'auto',
              left: top,
              bottom: left,
              right: 'auto'
            });
            break;
        }

        $signEl.css({
          transform: 'rotate(' + rotation + 'deg)'
        });

        $el.append(e.signEl);
      }
    });
  };

  // 每次打开文件触发该回调函数
  var openFileCallback = function () {
    signElArray = [];
  };

  init();

  return {
    openFileCallback: openFileCallback,
    pageDrawCallback: pageDrawCallback
  };
}));
