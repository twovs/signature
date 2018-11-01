/* Copyright 2016 Mozilla Foundation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/* globals chrome */

'use strict';

let DEFAULT_URL = '';

window.epTools = {
  ready: function(callback) {
    if (callback && typeof callback == 'function') {
      this._readyCallback = callback;
    }
  }
};

if (typeof PDFJSDev !== 'undefined' && PDFJSDev.test('CHROME')) {
  (function rewriteUrlClosure() {
    // Run this code outside DOMContentLoaded to make sure that the URL
    // is rewritten as soon as possible.
    let queryString = document.location.search.slice(1);
    let m = /(^|&)file=([^&]*)/.exec(queryString);
    DEFAULT_URL = m ? decodeURIComponent(m[2]) : '';

    // Example: chrome-extension://.../http://example.com/file.pdf
    let humanReadableUrl = '/' + DEFAULT_URL + location.hash;
    history.replaceState(history.state, '', humanReadableUrl);
    if (top === window) {
      chrome.runtime.sendMessage('showPageAction');
    }
  })();
}

let pdfjsWebApp;
if (typeof PDFJSDev !== 'undefined' && PDFJSDev.test('PRODUCTION')) {
  pdfjsWebApp = require('./app.js');
}

if (typeof PDFJSDev !== 'undefined' && PDFJSDev.test('FIREFOX || MOZCENTRAL')) {
  require('./firefoxcom.js');
  require('./firefox_print_service.js');
}
if (typeof PDFJSDev !== 'undefined' && PDFJSDev.test('GENERIC')) {
  require('./genericcom.js');
}
if (typeof PDFJSDev !== 'undefined' && PDFJSDev.test('CHROME')) {
  require('./chromecom.js');
}
if (typeof PDFJSDev !== 'undefined' && PDFJSDev.test('CHROME || GENERIC')) {
  require('./pdf_print_service.js');
}

function getViewerConfiguration() {
  return {
    appContainer: document.body,
    mainContainer: document.getElementById('viewerContainer'),
    viewerContainer: document.getElementById('viewer'),
    eventBus: null, // using global event bus with DOM events
    toolbar: {
      container: document.getElementById('toolbarViewer'),
      numPages: document.getElementById('numPages'),
      pageNumber: document.getElementById('pageNumber'),
      scaleSelectContainer: document.getElementById('scaleSelectContainer'),
      scaleSelect: document.getElementById('scaleSelect'),
      scaleSelectPageActualOption: document.getElementById('pageActualOption'),
      scaleSelectPageFitOption: document.getElementById('pageFitOption'),
      scaleSelectPageWidthOption: document.getElementById('pageWidthOption'),
      customScaleOption: document.getElementById('customScaleOption'),
      previous: document.getElementById('previous'),
      next: document.getElementById('next'),
      zoomIn: document.getElementById('zoomIn'),
      zoomOut: document.getElementById('zoomOut'),
      openFile: document.getElementById('openFile'),
      closeFile: document.getElementById('closeFile'),
      print: document.getElementById('print'),
      presentationModeButton: document.getElementById('presentationMode'),
      download: document.getElementById('download'),
      about: document.getElementById('toolbar-about'),
      aboutContainer: document.getElementById('aboutContainer'),
    },
    secondaryToolbar: {
      toolbar: document.getElementById('secondaryToolbar'),
      firstPageButton: document.getElementById('firstPage'),
      lastPageButton: document.getElementById('lastPage'),
      pageRotateCwButton: document.getElementById('pageRotateCw'),
      pageRotateCcwButton: document.getElementById('pageRotateCcw'),
    },
    fullscreen: {
      contextFirstPage: document.getElementById('contextFirstPage'),
      contextLastPage: document.getElementById('contextLastPage'),
      contextPageRotateCw: document.getElementById('contextPageRotateCw'),
      contextPageRotateCcw: document.getElementById('contextPageRotateCcw'),
    },
    sidebar: {
      // Divs (and sidebar button)
      mainContainer: document.getElementById('mainContainer'),
      outerContainer: document.getElementById('outerContainer'),
      // Views
      thumbnailView: document.getElementById('thumbnailView'),
      outlineView: document.getElementById('outlineView'),
      annotationView: document.getElementById('annotationView'),
      attachmentsView: document.getElementById('attachmentsView'),
    },
    findBar: {
      bar: document.getElementById('findbar'),
      findField: document.getElementById('findInput'),
      highlightAllCheckbox: document.getElementById('findHighlightAll'),
      caseSensitiveCheckbox: document.getElementById('findMatchCase'),
      findMsg: document.getElementById('findMsg'),
      findResultsCount: document.getElementById('findResultsCount'),
      findStatusIcon: document.getElementById('findStatusIcon'),
      findPreviousButton: document.getElementById('findPrevious'),
      findNextButton: document.getElementById('findNext'),
    },
    passwordOverlay: {
      overlayName: 'passwordOverlay',
      container: document.getElementById('passwordOverlay'),
      label: document.getElementById('passwordText'),
      input: document.getElementById('password'),
      submitButton: document.getElementById('passwordSubmit'),
      cancelButton: document.getElementById('passwordCancel'),
    },
    documentProperties: {
      overlayName: 'documentPropertiesOverlay',
      container: document.getElementById('documentPropertiesOverlay'),
      closeButton: document.getElementById('documentPropertiesClose'),
      fields: {
        'fileName': document.getElementById('fileNameField'),
        'fileSize': document.getElementById('fileSizeField'),
        'title': document.getElementById('titleField'),
        'author': document.getElementById('authorField'),
        'subject': document.getElementById('subjectField'),
        'keywords': document.getElementById('keywordsField'),
        'creationDate': document.getElementById('creationDateField'),
        'modificationDate': document.getElementById('modificationDateField'),
        'creator': document.getElementById('creatorField'),
        'producer': document.getElementById('producerField'),
        'version': document.getElementById('versionField'),
        'pageCount': document.getElementById('pageCountField'),
      },
    },
    errorWrapper: {
      container: document.getElementById('errorWrapper'),
      errorMessage: document.getElementById('errorMessage'),
      closeButton: document.getElementById('errorClose'),
      errorMoreInfo: document.getElementById('errorMoreInfo'),
      moreInfoButton: document.getElementById('errorShowMore'),
      lessInfoButton: document.getElementById('errorShowLess'),
    },
    printContainer: document.getElementById('printContainer'),
    openFileInputName: 'fileInput',
    debuggerScriptPath: './debugger.js',
    defaultUrl: DEFAULT_URL,
  };
}

function webViewerLoad() {
  let config = getViewerConfiguration();
  
  String.prototype.replaceAll = function(replaceStr, newStr) {
    var str = this;
    
    if (str.indexOf(replaceStr) !== -1) {
      str = this.replace(replaceStr, newStr);
      return str.replaceAll(replaceStr, newStr);
    }
    else {
      return str;
    }
  };

  if (typeof PDFJSDev === 'undefined' || !PDFJSDev.test('PRODUCTION')) {
    Promise.all([
      SystemJS.import('pdfjs-web/app'),
      SystemJS.import('pdfjs-web/genericcom'),
      SystemJS.import('pdfjs-web/pdf_print_service'),
    ]).then(function([app, ...otherModules]) {
      window.PDFViewerApplication = app.PDFViewerApplication;
      app.PDFViewerApplication.run(config);
      createApi(config);
    });
  } else {
    window.PDFViewerApplication = pdfjsWebApp.PDFViewerApplication;
    pdfjsWebApp.PDFViewerApplication.run(config);
    createApi(config);
  }
}

function createApi(config) {
  let defaultSettings = {
    ShowToolBarButton: function(nIndex, bShow) {
      nIndex = parseInt(nIndex, 10);
      bShow = typeof bShow == 'boolean' ? bShow : true;

      var moduleEl = document.querySelector('[tabindex="'+ nIndex +'"]');

      if (moduleEl) {
        bShow ? moduleEl.classList.remove('hidden') : moduleEl.classList.add('hidden');
      }
      else {
        alert('无此编号按钮');
      }
    },
    GoToPage: function (pageNumber) {
      PDFViewerApplication.pdfViewer.currentPageLabel = pageNumber;
    },
    GetCurrentPageIndex: function () {
      return PDFViewerApplication.page;
    },
    GetPageCounts: function () {
      return PDFViewerApplication.pagesCount;
    },
    OpenFile: function (path) {
      PDFViewerApplication.localUrl = '';
      PDFViewerApplication.open(path);
    },
    GotoBookMarkByBookMarkName: function (text) {
      var outline = PDFViewerApplication.pdfOutlineViewer.outline;

      if (outline && Array.isArray(outline)) {

        for (let i = 0, len = outline.length; i < len; i++) {
          const item = outline[i],
            title = item.title,
            items = item.items;

          if (~title.indexOf(text)) {
            PDFViewerApplication.pdfOutlineViewer.linkService.navigateTo(item.dest);

            return;
          }
          else if (items && Array.isArray(items)) {
            let k = 0;

            while(k < items.length) {
              const _item = items[k];

              if (~_item.title.indexOf(text)) {
                PDFViewerApplication.pdfOutlineViewer.linkService.navigateTo(_item.dest);

                return;
              }

              k++;
            }
          }
        }
      }
      else {
        alert('无书签页');
      }
    },
    GetFilePath: function() {
      return PDFViewerApplication.localUrl || PDFViewerApplication.url;
    },
    CloseFile: function() {
      PDFViewerApplication.close();
    },
    AfterSignPDF: function() {},
    AfterDelSignature: function() {},
    /**
     * 可支持指定位置盖章
     * @param {Object} params 参数
     * nPageStart 签章起始页
     * nPageEnd 签章末页
     * nSignatureIndex 签章索引
     * dbXAxisCoordinate X轴坐标
     * dbYAxisCoordinate Y轴坐标
     * strUsbkeyPassword 硬件介质Key密码
     */
    AddSignatureFromMouseType: function(params) {
      let nPageStart = parseInt(params.nPageStart) || 1,
        nPageEnd = params.nPageEnd || 5,
        nSignatureIndex = params.nSignatureIndex || 1,
        dbXAxisCoordinate = params.dbXAxisCoordinate || 200,
        dbYAxisCoordinate = params.dbYAxisCoordinate || 200;

      let pdfViewer = PDFViewerApplication.pdfViewer,
        pageScale = PDFViewerApplication.toolbar.pageScale;

       if(!dbXAxisCoordinate && typeof dbXAxisCoordinate != 'number') {
        console.error('请传入X轴坐标');
        return;
      }
        
      if(!dbYAxisCoordinate && typeof dbYAxisCoordinate != 'number') {
        console.error('请传入Y轴坐标');
        return;
      } 

      if (nPageEnd > 0 && nPageEnd > nPageStart) {
        let signImage = document.createElement('img');

        signImage.src = './images/company.png';
        signImage.onload = function() {
          const imgWidth = this.width,
            imgHeight = this.height;

          for (let i = nPageStart; i <= nPageEnd; i++) {
            let curPageView = pdfViewer.getPageView(i - 1),
              $curPageEl = $('#viewer').find('[data-page-number="'+ i +'"]'),
              $div = $('<div class="addSign"></div>'),
              top = dbXAxisCoordinate,
              left = dbYAxisCoordinate;

            $div.css({
              width: imgWidth + 'px',
              height: imgHeight + 'px',
              position: 'absolute',
              left: left + 'px',
              top: top + 'px'
            });

            $div.append('<img src="./images/company.png" />');
            $curPageEl.append($div);

            if (curPageView.signArray && Array.isArray(curPageView.signArray)) {
              curPageView.signArray.push($div.get(0));
            }
            else {
              curPageView.signArray = [$div.get(0)];
            }
            
            // 自动签章的相关参数
            curPageView.autoSignParams = {
              initPageScale: pageScale,
              initTop: top,
              initLeft: left,
              initWidth: imgWidth,
              initHeight: imgHeight
            };
            pdfViewer.renderingQueue.renderView(curPageView);
          }
        };
      }
    },
    
    /**
     * 设置暗标
     * @param {Object} str 当前字符串
     * @param {Object} darkMarkStr 暗标字符
     */
    SetDarkMark: function(str, darkMarkStr) {      
    	this._darkMarkOptions = {
    		str: str,
    		darkMarkStr: darkMarkStr || '*'
    	};
    },
    
    /**
     * 调用 iwebOA 下载文件，并且保存 - 只有在 ie 环境下才可以使用
     * @param {Object} networkUrl 要下载文件的网络路径
     * @param {Object} savePath 保存在本地的路径
     */
    iWebOA: function(networkUrl, savePath) {
      // 如果是在 ie 浏览器下
      if (!!window.ActiveXObject || 'ActiveXObject' in window) {
        if (!networkUrl && typeof networkUrl !== 'string') {
          console.error('请输入下载的网络路径');
          return;
        }
        
        if (!savePath && typeof savePath !== 'string') {
          console.error('请输入要保存的路径');
          return;
        }
        
        document.getElementById('iWebOA').GetWebData2LocalFile(networkUrl, savePath);
      }
      else {
        console.error('iWebOA 只能在 ie 浏览器环境下使用');
      }
    }
  };

  extend(window.epTools, defaultSettings);

  Object.defineProperties(window.epTools, function() {
    var result = {};

    for (var k in window.epTools) {
      result[k] = {
        writable: false
      }
    }

    return result;
  }());

  let _readyCallback = window.epTools._readyCallback;

  if (_readyCallback && typeof _readyCallback == 'function') {
    _readyCallback.call(window.epTools);
  }
}

function extend() {
  var args = [].slice.call(arguments),
    result = args[0];

  for (var i = 1, len = args.length; i < len; i++) {
    var item = args[i];

    for (var k in item) {
      if (result[k] === undefined) {
        result[k] = item[k];
      }
    }
  }

  return result;
}

if (document.readyState === 'interactive' ||
    document.readyState === 'complete') {
  webViewerLoad();
} else {
  document.addEventListener('DOMContentLoaded', webViewerLoad, true);
}
