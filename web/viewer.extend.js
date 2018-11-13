(function(win, fn) {
  'use strict';

  var returnVal = fn();

  for(var k in returnVal) {
    win[k] = returnVal[k];
  }

}(this, function() {
  var $uiPopup = $('#ui-popup'),
    $uiPopupContent = $('#ui-popup-content'),
    $viewerContainer = $('#viewerContainer'),
    $signContainer = $('#signContainer'),
    $signaturePreview = $('#signature-preview'),
    $sign = $('#sign'),
    $mainContainer = $('#mainContainer'),
    $contextmenu = $('#delsigndiv'),
    $selectSignType = $('#selectSignType'),
    $choicePage = $('#choicePage'),
    $verifyContainerCon = $('#verifyContainer .verifyContainer-con');

  var $tplPopup = $('#tpl-uipopup').html(),
    tplAnnotationView = document.getElementById('tpl-annotationView').innerHTML,
    tplVerify = $('#tpl-verifyContainer-con').html();

  var isOpenSig = false, // 是否满足签章条件，并且点击了开始签章
    signElArray = [],
    initSignImgWidth = 0,
    initSignImgHeight = 0,
    siderMenuBarWidth = $('#siderMenuBar').width(),
    selectSignType = 'normal', // 添加签章 ——> 签章类型，默认为 普通签章(normal)
    signInformation = []; // 签章完毕后，保存的签章信息，key 是对应的 signId

  var sign_div,
    sign_img;

  var blob_Url = null,
    time = null; // 轮训接口的定时器

  var SidebarView = {
    NONE: 0,
    THUMBS: 1,
    OUTLINE: 2,
    ATTACHMENTS: 3,
    ANNOTATION: 4
  };

  var toolbarHeight = $('#toolbarContainer').height();
  var qrcode = new QRCode('qrcode', {
    width: 300,
    height: 300
  });
  var userId = getLocationUserId();

  function init() {
    initListener();
    toolbarBindListeners();
  }

  /**
   * 获取 userid
   * @returns {String} 匹配结果
   */
  function getLocationUserId() {
    var result = window.location.search.match(/user=([^&]*)/);

    if(result && Array.isArray(result)) {
      return result[1];
    }

    return '';
  }

  function initListener() {
    var offsetLeft,
      offsetTop;

    $viewerContainer.on('click', 'section[data-annotation-type=sign]',
      function() {
        var id = $(this).attr('data-annotation-id'),
          signData = window.responseSignData || [];

        if(signData.length < 1) {
          alert('暂无此签章信息');
          return;
        }

        $.each(signData, function(i, e) {
          if(e.id == id) {
            // 渲染签章信息
            renderSignInformation(e);
          }
        });
      }).on('click', '.page', function() {
      var pageNumber = $(this).attr('data-page-number');

      // 如果开启了签章，并且已有pdf展示
      if(isOpenSig) {
        var left = parseInt($(sign_div).css('left'), 10),
          top = parseInt($(sign_div).css('top'), 10);

        var $curPageEl = $viewerContainer.find('[data-page-number="' +
            pageNumber + '"]'),
          div = document.createElement('div'),
          img = document.createElement('img'),
          canvasWrapperHeight = $(this).find('.canvasWrapper').height(),
          scale = PDFViewerApplication.toolbar.pageScale;

        div.className = '_addSign';
        img.src = sign_img.src;
        img.className = '_signimg';
        img.width = sign_img.width;
        img.height = sign_img.height;

        $(div).css({
          left: left + 'px',
          top: top + 'px'
        });

        $(div).append(img);

        var imgBase64 = imgToBase64(img) || '';

        if(imgBase64.indexOf('base64') !== -1) {
          imgBase64 = imgBase64.split(',')[1];
        }

        img.onload = function() {
          var defaultOptions = {
            signDiv: div,
            pageNumber: pageNumber,
            img: img,
            top: top,
            left: left,
            $curPageEl: $curPageEl
          };

          var imgWidth = img.width,
            imgHeight = img.height;

          var x = (left + imgWidth / 2) / scale * 0.75,
            y = (top + imgHeight / 2) / scale * 0.75;

          // TODO: 根据类型走不同的函数处理
          switch(selectSignType) {
            case 'normal':
              selectSignTypeNormal({
                "userid": userId,
                "sign": {
                  "signimg": imgBase64,
                  "positions": [{
                    "page": pageNumber,
                    "x": x,
                    "y": y
                  }]
                }
              }, defaultOptions);
              break;

            case 'multiSign':
              var selectMultiPageSignType = $('#choicePage input[type=radio]:checked').prop('value');
              var params = {};
              // 签章的页面数, pageNumber
              var pages = [];

              // 全部页面签章
              if(selectMultiPageSignType == 'all') {
                var pagesCount = epTools.GetPageCounts();

                for(var i = 1; i <= pagesCount; i++) {
                  pages.push(i);
                }
              }
              // 指定页面签章
              else if(selectMultiPageSignType == 'multiplePages') {
                var spreadPageVal = $('#spreadPage').val();

                if(!spreadPageVal) {
                  alert('请输入要进行签章的页码数');
                  return;
                }

                if(spreadPageVal && typeof spreadPageVal == 'string') {
                  var spreadPageArray = spreadPageVal.split('、');

                  $.each(spreadPageArray, function(i, e) {
                    e = parseInt(e, 10);
                    // 如果是当前页面
                    pages.push(e);
                  });
                }
              }

              params = {
                "userid": userId,
                "sign": {
                  "signimg": imgBase64,
                  "position": {
                    "pages": pages,
                    "x": x,
                    "y": y
                  }
                }
              };

              selectSignTypeMultiPage(params, defaultOptions);
              break;

            case 'pagingSeal':
              break;

            default:
              break;
          }

          var movesign = $(this).find('.movesign');

          $.each(movesign, function(i, e) {
            e.remove();
          });

          sign_div = null;
          sign_img = null;
          isOpenSig = false;
        };
      }
    }).on('mouseenter', '.page', function(e) {
      var $this = $(this);
      var pageX = e.pageX,
        pageY = e.pageY;

      offsetLeft = this.offsetLeft + $mainContainer.get(0).offsetLeft;
      offsetTop = this.offsetTop + $mainContainer.get(0).offsetTop;

      if(isOpenSig) {
        var top = pageY - offsetTop - sign_img.height / 2 +
          $viewerContainer.get(0).scrollTop - toolbarHeight,
          left = pageX - offsetLeft - sign_img.width / 2 -
          siderMenuBarWidth;

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

      if(isOpenSig) {
        var top = pageY - offsetTop - sign_img.height / 2 +
          $viewerContainer.get(0).scrollTop - toolbarHeight,
          left = pageX - offsetLeft - sign_img.width / 2 -
          siderMenuBarWidth;

        $(sign_div).css({
          top: top + 'px',
          left: left + 'px'
        });
      }
    }).on('mouseleave', function(e) {
      var movesign = $(this).find('.movesign');

      $.each(movesign, function(i, e) {
        e.remove();
      });

      sign_div = null;
      sign_img = null;
      isOpenSig = false;
    });

    // 点击查找按钮
    $('#findBtn').on('click', function() {
      PDFViewerApplication && PDFViewerApplication.findBar.dispatchEvent('');
    });

    // 关闭签章区域
    var closeSignPad = function() {
      $signContainer.addClass('hidden');
    };

    $selectSignType.on('click', 'input[type=radio]', function() {
      var val = this.value;

      selectSignType = val;

      // 如果选择的是批量签章展示页数
      if(selectSignType == 'multiSign') {
        $choicePage.removeClass('hidden');
      } else {
        $choicePage.addClass('hidden');
      }
    });

    // 点击添加签章按钮签章
    $('#signContainer').on('click', '.confirm-btn', function() {
        if(PDFViewerApplication.pdfViewer.viewer.childNodes.length == 0) {
          isOpenSig = false;

          alert('请先打开需要签章的pdf文件');
          closeSignPad();
        } else {
          // 如果选择的签章类型是关键字签章，则不生成signElement
          if(selectSignType == 'keyWordSign') {
            var epTools = window.epTools,
              signSearchVal = $('.sigsearch-input').val();

            epTools && typeof epTools.keyWordStamp == 'function' && epTools.keyWordStamp(signSearchVal);
          } else {
            // 创建 sign_div
            createSignElement();
          }
          // 关闭签章面板
          closeSignPad();
        }
      })
      .on('click', '.signContainer-close', function() {
        // 点击关闭 X
        closeSignPad();
      });

    // 单个签章
    $sign.on('click', function() {
      $signaturePreview.html("<img src='./images/company.png' />");
      $signContainer.removeClass('hidden');
    });

    $uiPopup.on('click', '.ui-popup-close', function() {
      $uiPopup.removeClass('zoomIn animated faster');
      $uiPopup.addClass('hidden');
    }).on('click', '.ep-a-cert', function(e) {
      e.preventDefault();

      // 点击下载证书
      if(blob_Url) {

        if('msSaveOrOpenBlob' in window.navigator) {
          // Microsoft Edge and Microsoft Internet Explorer 10-11
          window.navigator.msSaveOrOpenBlob(blob_Url, '证书.cer');
        } else {
          // chrome or firefox
          var a = document.createElement('a');

          a.download = '证书';
          a.href = window.URL.createObjectURL(blob_Url);
          a.click();
        }
      }
    });

    $contextmenu.on('click', 'li', function() {
      var $el = $viewerContainer.find('[data-index="' + delSerial + '"]'),
        signId = $el.attr('data-signid');

      signElArray.splice(delSerial, 1, undefined);

      if(signId) {
        // 删除对应的签章信息
        $.each(signInformation, function(i, e) {
          if(e && e[signId]) {
            signInformation.splice(i, 1, undefined);
            signInformation = signInformation.filter(function(e, i) {
              if(Boolean(e)) {
                return e;
              }
            });
          }
        });
      }

      $(PDFViewerApplication.appConfig.sidebar.annotationView).find('[data-id="' + signId + '"]').remove();
      $el.remove();
      $contextmenu.hide();
    });

    $('img').on('mousedown', function(e) {
      e.preventDefault();
    });

    // 点击左侧 sideBar menu
    $('#siderMenuBar').on('click', '.menuItem', function() {
      var menuType = this.dataset.menu,
        $this = $(this);

      if(!$this.hasClass('silderOpen')) {
        $this.toggleClass('active').siblings('.menuItem').removeClass(
          'active');
      }

      switch(menuType) {
        case 'bookMark':
          PDFViewerApplication.pdfSidebar.switchView(SidebarView.OUTLINE);
          break;

        case 'thumbnail':
          PDFViewerApplication.pdfSidebar.switchView(SidebarView.THUMBS);
          break;

        case 'annotation':
          PDFViewerApplication.pdfSidebar.switchView(SidebarView.ANNOTATION);
          break;

        default:
          break;
      }
    });

    // 关闭 silderBar
    $('#silderClose').on('click', function() {
      $('#siderMenuBar .menuItem').removeClass('active');
      PDFViewerApplication.pdfSidebar.close();
    });

    // 点击显示签章信息
    $viewerContainer.on('click', '._addSign', function() {
      var signid = this.dataset.signid,
        value = null;

      $.each(signInformation, function(i, e) {
        var item = e[signid];

        if(item) {
          value = item;
          return;
        }
      });

      if(!value) {
        alert('暂无此签章信息');
        return;
      }

      // 渲染签章信息
      renderSignInformation(value);
    });

    $('#mask').on('click', function() {
      clearTimeout(time);
      $(this).addClass('hidden');
      $('#qrcodeContainer').addClass('hidden');
    });
  }

  /**
   * 选择的签章类型是普通签章方法函数
   * @param {Object} params 接口需要的请求参数
   * @param {Object} options 一些逻辑处理上需要的参数
   * signDiv {HTMLElement} 签章插入DOM的元素
   * top {Number} 签章距离 page 顶部的距离
   * left {Number} 签章距离 page 左侧的距离
   * img {HTMLElement} 签章图片的DOM元素
   * pageNumber {Number} 当前签章的页数
   */
  function selectSignTypeNormal(params, options) {
    var top = options.top,
      left = options.left,
      img = options.img;

    // 验证二维码, 一定要扫码后方可进行签章
    createSignQrCode(params, comSignUrl, function(response) {
      epTools.createSignCallback(response, img, top, left);
    });
  }

  /**
   * 选择的签章类型是普通签章方法函数
   * @param {Object} params 接口需要的请求参数
   * @param {Object} options 一些逻辑处理上需要的参数
   * signDiv {HTMLElement} 签章插入DOM的元素
   * top {Number} 签章距离 page 顶部的距离
   * left {Number} 签章距离 page 左侧的距离
   * img {HTMLElement} 签章图片的DOM元素
   * pageNumber {Number} 当前签章的页数
   */
  function selectSignTypeMultiPage(params, options) {
    var top = options.top,
      left = options.left,
      img = options.img;

    // 创建签章二维码，multiSignPage
    createSignQrCode(params, multiPageSignUrl, function(response) {
      epTools.createSignCallback(response, img, top, left);
    });
  }

  $.extend(window.epTools, {
    createSignCallback: function(response, img, top, left) {
      var verify = response.msg.verify;

      for(var i = 0, len = verify.length; i < len; i++) {
        var signEl = document.createElement('div'),
          signImg = document.createElement('img'),
          item = verify[i],
          signid = item.signid,
          pageNumber = item.page,
          tmp = {},
          isIntegrity = item.isIntegrity;

        tmp[signid] = item;
        signInformation.push(tmp);
        signEl.className = '_addSign';
        signEl.dataset.signid = signid;
        $(signEl).css({
          left: left,
          top: top
        });

        signImg.className = '_signimg';
        signImg.src = img.src;
        $(signImg).css({
          width: img.width,
          height: img.height
        });

        signEl.append(signImg);
        window.signCount += 1;

        var $curPage = $viewerContainer.find('.page[data-page-number=' + pageNumber + ']'),
          curPageEl = $curPage.get(0);

        if(curPageEl && curPageEl.nodeType == 1) {
          curPageEl.appendChild(signEl);

          if(!!isIntegrity) {
            // TODO: 创建签章状态标识 isIntegrity 为 true
            createSignStatusImg('success', signid, epTools.AfterSignPDF);
          } else {
            // 创建签章状态标识 isIntegrity 为 false
            window.isSignIntegrity = false;
            createSignStatusImg('error', signid, epTools.AfterSignPDF);
          }
        }

        // 添加到数字签名区域
        addToAnnotationView(item);
        signElArray.push({
          pageNumber: pageNumber,
          signid: signid,
          signEl: signEl,
          isIntegrity: isIntegrity,
          scale: PDFViewerApplication.toolbar.pageScale,
          imgWidth: img.width,
          imgHeight: img.height,
          top: top,
          left: left,
          pageRotation: PDFViewerApplication.pageRotation
        });
      }
      
      epTools.downloadUrl = response.msg.url;
    }
  });

  /**
   * 选择签章类型为普通签章方法
   */
  function createSignElement() {
    var pageScale = PDFViewerApplication.toolbar.pageScale;

    sign_img = document.createElement('img');
    sign_div = document.createElement('div');

    sign_img.src = $signaturePreview.find('img').prop('src');
    sign_img.onload = function() {
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

  /**
   * TODO: 创建签章二维码
   * @param {Object} params 参数
   * @param {String} url 接口地址
   * @param {Function} successCallback 成功回调函数
   */
  function createSignQrCode(params, url, successCallback) {
    var type = epTools.type,
      msg = epTools.msg;

    var formData = new FormData();

    if(type == 'url') {
      params.pdf = {
        type: type,
        msg: msg
      };

      formData.append('params', JSON.stringify(params));
    } else if(type == 'file') {
      params.pdf = {
        type: type,
        msg: ''
      };

      formData.append('params', JSON.stringify(params));
      formData.append('file', msg);
    }

    $.ajax({
      type: "post",
      url: url,
      data: formData,
      processData: false,
      contentType: false,
      dataType: 'json',
      timeout: 5000,
      success: function(response) {
        var qrcodeid = response.msg.qrcodeid;

        if(response.status == 'ok' && qrcodeid && typeof qrcodeid == 'string') {
          qrcode.clear();
          $('#qrcodeContainer').removeClass('hidden');
          $('#mask').removeClass('hidden');
          qrcode.makeCode(JSON.stringify(response.msg));
          // 挂起验证
          verifyQrCodeHasUse(qrcodeid, successCallback);
          // TODO: 模拟接口扫描
          mockScan(qrcodeid);
        } else {
          console.error('生成二维码失败');
        }
      },
      error: function() {
        console.error('生成二维码失败');
      }
    });
  }

  /**
   * 验证签章二维码是否已经使用了
   * @param {String} qrcodeid 二维码id
   * @param {Function} successCallback status为ok 成功回调函数
   */
  function verifyQrCodeHasUse(qrcodeid, successCallback) {
    var formdata = new FormData();

    formdata.append('params', JSON.stringify({
      qrcodeid: qrcodeid
    }));

    time = setTimeout(function polling() {
      $.ajax({
        url: verifyQrCodeHasUseUrl,
        type: 'post',
        data: formdata,
        dataType: 'json',
        processData: false,
        contentType: false,
        success: function(response) {
          switch(response.status) {
            case 'ok':
              clearTimeout(time);
              $('#qrcodeContainer').addClass('hidden');
              $('#mask').addClass('hidden');
              successCallback && typeof successCallback == 'function' && successCallback(response);
              break;

            case 'wait':
              time = setTimeout(function() {
                polling();
              }, 1000);
              break;

            default:
              clearTimeout(time);
              $('#qrcodeContainer').addClass('hidden');
              $('#mask').addClass('hidden');
              alert(response.msg);
              break;
          }
        },
        error: function() {
          console.error('验证二维码扫描失败');
        }
      });
    }, 1000);
  }

  /**
   * 渲染签章信息页面
   * @param {Object} e 签章信息
   */
  function renderSignInformation(e) {
    var cert = e.cert;

    if(e.isIntegrity) {
      e.signCls = 'success';
      e.signDescription = '签名有效，由"' + cert.signer +
        '"签名，自应用本签名以来，"文档"未被修改';
    } else {
      e.signCls = 'error';
      e.signDescription = '签名无效，由"' + cert.signer +
        '"签名，自应用本签名以来，"文档"已被更改或损坏';
    }

    blob_Url = base64ToBlob(cert.base64Cert);

    $uiPopupContent.html(Mustache.render($tplPopup, e));
    $uiPopup.addClass('zoomIn animated faster');
    $uiPopup.removeClass('hidden');
  }

  /**
   * img 转 base64
   * @param {HTMLElement} img nodeType = 1
   * @returns {String} base64 转换完成的 base64
   */
  function imgToBase64(img) {
    if(img.nodeType == 1) {
      var canvasEl = document.createElement('canvas'),
        ctx = canvasEl.getContext('2d'),
        imgWidth = img.width,
        imgHeight = img.height;

      canvasEl.width = imgWidth;
      canvasEl.height = imgHeight;

      ctx.drawImage(img, 0, 0, imgWidth, imgHeight);

      return canvasEl.toDataURL('image/png');
    }
  }

  /**
   * 绑定工具栏关于新点事件
   */
  function toolbarBindListeners() {
    // 关闭关于新点
    document.getElementById('abountContainer-close').addEventListener(
      'click',
      function() {
        PDFViewerApplication.appConfig.toolbar.aboutContainer.classList.add(
          'hidden');
      });

    // 书签展示
    document.getElementById('viewOutline').addEventListener('click',
      function() {
        PDFViewerApplication.pdfSidebar.switchView(SidebarView.OUTLINE);
      });

    // 验证展示
    document.getElementById('verification').addEventListener('click', function() {
      // 验证完毕
      if(typeof window.signCount == 'number' && typeof window.isSignIntegrity == 'boolean') {
        if(window.isSignIntegrity) {
          $verifyContainerCon.html(Mustache.render(tplVerify, {
            result: '文档未被修改，文档验证有效',
            icon: './images/sign-check-48.png',
            count: window.signCount
          }));
        } else {
          $verifyContainerCon.html(Mustache.render(tplVerify, {
            result: '文档已经被修改，文档验证失效',
            icon: './images/sign-error-48.png',
            count: window.signCount
          }));
        }
      } else {
        $verifyContainerCon.html('请先打开相关 pdf 文件');
      }

      $('#verifyContainer').toggleClass('hidden');
    });

    // 验证展示关闭按钮
    $('#verifyContainer .verifyContainer-close').on('click', function() {
      $('#verifyContainer').addClass('hidden');
    });
  }

  /**
   * addToAnnotationView 添加到数字签名区域
   * @param {Object} data 签章的数据
   */
  function addToAnnotationView(data) {
    data.signdate = getDate(data.signdate);
    data.signImg = 'data:image/png;base64,' + data.signImg;

    PDFViewerApplication.appConfig.sidebar.annotationView.innerHTML += Mustache.render(tplAnnotationView, data);
  }

  /**
   * 创建签章状态标识
   * @param {String} status 签章是否成功 success or error
   * @param {String} signId 签章标识
   * @param {Function} callback 执行回调函数
   */
  function createSignStatusImg(status, signId, callback) {
    var $signDiv = $viewerContainer.find('div[data-signid="' + signId +
      '"]');
    var img = document.createElement('img');
    var pageScale = PDFViewerApplication.toolbar.pageScale;
    var pageRotation = PDFViewerApplication.pageRotation;

    img.src = status === 'success' ? './images/sign-check-48.png' :
      './images/sign-error-48.png';
    img.className = '_signstatus';

    img.onload = function() {
      initSignImgWidth = this.width * pageScale;
      initSignImgHeight = this.height * pageScale;

      $(this).css({
        width: initSignImgWidth,
        height: initSignImgHeight,
        transform: 'rotate(' + pageRotation + 'deg)'
      });
    };

    typeof callback === 'function' && callback.call(epTools);
    $signDiv.append(img);
  }

  function getDate(millisecond) {
    var date = new Date(millisecond);

    return date.getFullYear() + '-' + appendZero(date.getMonth() + 1) + '-' +
      appendZero(date.getDate()) + ' ' + appendZero(date.getHours()) + ':' +
      appendZero(date.getMinutes()) + ':' + appendZero(date.getSeconds());
  }

  function appendZero(sum) {
    if(sum < 10) {
      return '0' + sum;
    }

    return sum;
  }

  function base64ToBlob(b64) {
    // 解码 b64 并且转换成 btype
    // 注意，这边 atob 必须解码的是没有 url 部分的 base64 值，如果带有 url 部分，解码会报错！
    b64 = b64.replace(/\s/g, '');
    var btypes = window.atob(b64);

    // 处理异常，将ascii码小于0的转换为大于0
    var ab = new ArrayBuffer(btypes.length);
    // 生成视图（直接针对内存）：8位无符号整数，长度1个字节
    var ia = new Uint8Array(ab);

    for(var i = 0, len = btypes.length; i < len; i++) {
      ia[i] = btypes.charCodeAt(i);
    }

    return new Blob([ab], {
      type: 'application/x-x509-ca-cert'
    });
  }

  // 渲染页面触发该事件
  var pageDrawCallback = function() {
    var scale = PDFViewerApplication.toolbar.pageScale,
      rotation = PDFViewerApplication.pageRotation;

    /**
     * 渲染页面发生改变的时候，对签章改变做重绘处理
     * @param {Object} e 遍历的参数
     */
    var signReDrawCallback = function(e) {
      if(e) {
        var $el = $viewerContainer.find('[data-page-number="' + e.pageNumber +
            '"]'),
          signEl = e.signEl,
          $signEl = $(signEl),
          $img = $signEl.find('._signimg'),
          width, height, top, left;

        top = e.top / e.scale * scale;
        left = e.left / e.scale * scale;
        width = e.imgWidth / e.scale * scale;
        height = e.imgHeight / e.scale * scale;

        // 如果是多页签章得话要考虑到懒加载未插入的签章 status
        if(selectSignType == 'multiSign' && !$signEl.find('._signstatus').get(0)) {
          if(!!e.isIntegrity) {
            // TODO: 创建签章状态标识 isIntegrity 为 true
            createSignStatusImg('success', e.signid, epTools.AfterSignPDF);
          } else {
            // 创建签章状态标识 isIntegrity 为 false
            createSignStatusImg('error', e.signid, epTools.AfterSignPDF);
          }
        }

        $img.css({
          width: width,
          height: height
        });

        $signEl.find('._signstatus').css({
          width: initSignImgWidth / e.scale * scale,
          height: initSignImgHeight / e.scale * scale
        });

        switch(rotation) {
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
    };

    // 改变页面的时候重新渲染 -> 单页签章、多页签章
    $.each(signElArray, function(i, e) {
      signReDrawCallback(e);
    });

    // 改变页面的时候重新渲染 -> 关键字签章
    $.each(epTools.keyWordSignElArray, function(i, e) {
      signReDrawCallback(e);
    });
  };

  /**
   * TODO: 模拟签章
   * @param {String} qrcodeid 二维码标识
   */
  function mockScan(qrcodeid) {
    $.get('http://192.168.108.217:8099/H5PDF/qrsign/mockScan?codeid=' + qrcodeid);
  }

  // 每次打开文件触发该回调函数
  var openFileCallback = function() {};

  // 每次关闭文件触发该回调函数
  var closeFileCallback = function() {};

  // 每次打开和关闭文件触发该回调函数
  var toggleFileCallback = function() {
    signElArray = [];
    window.signCount = 0;
    window.isSignIntegrity = undefined;

    if(epTools.keyWordSignElArray && Array.isArray(epTools.keyWordSignElArray)) {
      epTools.keyWordSignElArray = [];
    }
  };

  init();

  return {
    openFileCallback: openFileCallback,
    pageDrawCallback: pageDrawCallback,
    closeFileCallback: closeFileCallback,
    toggleFileCallback: toggleFileCallback
  };
}));