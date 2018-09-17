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
      customScaleOption: document.getElementById('customScaleOption'),
      previous: document.getElementById('previous'),
      next: document.getElementById('next'),
      zoomIn: document.getElementById('zoomIn'),
      zoomOut: document.getElementById('zoomOut'),
      viewFind: document.getElementById('viewFind'),
      openFile: document.getElementById('openFile'),
      closeFile: document.getElementById('closeFile'),
      print: document.getElementById('print'),
      presentationModeButton: document.getElementById('presentationMode'),
      download: document.getElementById('download'),
      viewBookmark: document.getElementById('viewBookmark'),
    },
    secondaryToolbar: {
      toolbar: document.getElementById('secondaryToolbar'),
      toggleButton: document.getElementById('secondaryToolbarToggle'),
      toolbarButtonContainer:
        document.getElementById('secondaryToolbarButtonContainer'),
      presentationModeButton:
        document.getElementById('secondaryPresentationMode'),
      openFileButton: document.getElementById('secondaryOpenFile'),
      printButton: document.getElementById('secondaryPrint'),
      downloadButton: document.getElementById('secondaryDownload'),
      viewBookmarkButton: document.getElementById('secondaryViewBookmark'),
      firstPageButton: document.getElementById('firstPage'),
      lastPageButton: document.getElementById('lastPage'),
      pageRotateCwButton: document.getElementById('pageRotateCw'),
      pageRotateCcwButton: document.getElementById('pageRotateCcw'),
      cursorSelectToolButton: document.getElementById('cursorSelectTool'),
      cursorHandToolButton: document.getElementById('cursorHandTool'),
      documentPropertiesButton: document.getElementById('documentProperties'),
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
      toggleButton: document.getElementById('sidebarToggle'),
      // Buttons
      thumbnailButton: document.getElementById('viewThumbnail'),
      outlineButton: document.getElementById('viewOutline'),
      attachmentsButton: document.getElementById('viewAttachments'),
      // Views
      thumbnailView: document.getElementById('thumbnailView'),
      outlineView: document.getElementById('outlineView'),
      attachmentsView: document.getElementById('attachmentsView'),
    },
    findBar: {
      bar: document.getElementById('findbar'),
      toggleButton: document.getElementById('viewFind'),
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

  // 创建API
  createApi(config);

  if (typeof PDFJSDev === 'undefined' || !PDFJSDev.test('PRODUCTION')) {
    Promise.all([
      SystemJS.import('pdfjs-web/app'),
      SystemJS.import('pdfjs-web/genericcom'),
      SystemJS.import('pdfjs-web/pdf_print_service'),
    ]).then(function([app, ...otherModules]) {
      window.PDFViewerApplication = app.PDFViewerApplication;
      app.PDFViewerApplication.run(config);
    });
  } else {
    window.PDFViewerApplication = pdfjsWebApp.PDFViewerApplication;
    pdfjsWebApp.PDFViewerApplication.run(config);
  }
}

function createApi(config) {
  let defaultSettings = {
    tools: {
      viewOutline: true,
      viewThumbnail: true,
      viewAttachments: true,
      viewFind: true,
      firstPage: true,
      lastPage: true,
      splitToolbarButton: true,
      zoom: true,
      scaleSelect: true,
      openFile: true,
      closeFile: true,
      fullScreen: true,
      print: true,
      download: true,
      secondaryToolbar: true,
      pageRotateCw: true,
      pageRotateCcw: true
    },
    pageNumberNavitorTo: function (pageNumber) {
      PDFViewerApplication.pdfViewer.currentPageLabel = pageNumber;
    },
    getCurrentPage: function () {
      return PDFViewerApplication.page;
    },
    getPageCount: function () {
      return PDFViewerApplication.pagesCount;
    },
    OpenFile: function (path) {
      PDFViewerApplication.localUrl = '';
      PDFViewerApplication.open(path);
    },
    linkTo: function (text) {
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
    AfterDelSignature: function() {}
  };

  window.epTools = window.epTools || {};
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

  handleBarIconToggle(config, epTools.tools);
}

function handleBarIconToggle(config, tools) {
  var toolbar = config.toolbar,
    sidebar = config.sidebar,
    secondaryToolbar = config.secondaryToolbar;

  var toggleViewOutline = function (val) {
    var outlineButton = sidebar.outlineButton;

    val ? outlineButton.removeAttribute('hidden') : outlineButton.setAttribute(
      'hidden', true);
  };

  var toggleViewThumbnail = function (val) {
    var thumbnailButton = sidebar.thumbnailButton;

    val ? thumbnailButton.removeAttribute('hidden') : thumbnailButton.setAttribute(
      'hidden', true);
  };

  var toggleViewAttachments = function (val) {
    var attachmentsButton = sidebar.attachmentsButton;

    val ? attachmentsButton.removeAttribute('hidden') : attachmentsButton.setAttribute(
      'hidden', true);
  };

  var toggleViewFind = function (val) {
    var viewFind = toolbar.viewFind;

    val ? viewFind.removeAttribute('hidden') : viewFind.setAttribute('hidden',
      true);
  };

  var toggleFirstPage = function (val) {
    var firstPageButton = secondaryToolbar.firstPageButton;

    val ? firstPageButton.removeAttribute('hidden') : firstPageButton.setAttribute(
      'hidden', true);
  };

  var toggleLastPage = function (val) {
    var lastPageButton = secondaryToolbar.lastPageButton;

    val ? lastPageButton.removeAttribute('hidden') : lastPageButton.setAttribute(
      'hidden', true);
  };

  var toggleSplitToolbar = function (val) {
    var previous = toolbar.previous,
      next = toolbar.next;

    if (val) {
      previous.removeAttribute('hidden');
      next.removeAttribute('hidden');
    } else {
      previous.setAttribute('hidden', true);
      next.setAttribute('hidden', true);
    }
  };

  var toggleZoom = function (val) {
    var zoomIn = toolbar.zoomIn,
      zoomOut = toolbar.zoomOut;

    if (val) {
      zoomIn.removeAttribute('hidden');
      zoomOut.removeAttribute('hidden');
    } else {
      zoomIn.setAttribute('hidden', true);
      zoomOut.setAttribute('hidden', true);
    }
  };

  var toggleScaleSelect = function (val) {
    var scaleSelect = toolbar.scaleSelect;

    val ? scaleSelect.removeAttribute('hidden') : scaleSelect.setAttribute(
      'hidden', true);
  };

  var toggleOpenFile = function (val) {
    var openFile = toolbar.openFile;

    val ? openFile.removeAttribute('hidden') : openFile.setAttribute('hidden',
      true);
  };

  var toggleCloseFile = function (val) {
    var closeFile = toolbar.closeFile;

    val ? closeFile.removeAttribute('hidden') : closeFile.setAttribute(
      'hidden', true);
  };

  var toggleFullScreen = function (val) {
    var presentationModeButton = toolbar.presentationModeButton;

    val ? presentationModeButton.removeAttribute('hidden') :
      presentationModeButton.setAttribute('hidden', true);
  };

  var togglePrint = function (val) {
    var print = toolbar.print;

    val ? print.removeAttribute('hidden') : print.setAttribute('hidden', true);
  };

  var toggleDownload = function (val) {
    var download = toolbar.download;

    val ? download.removeAttribute('hidden') : download.setAttribute('hidden',
      true);
  };

  var toggleSecondaryToolbar = function (val) {
    var toggleButton = secondaryToolbar.toggleButton;

    val ? toggleButton.removeAttribute('hidden') : toggleButton.setAttribute(
      'hidden', true);
  };

  var toggleViewBookMark = function (val) {
    var toggleViewBook = secondaryToolbar.viewBookmarkButton;

    val ? toggleViewBook.removeAttribute('hidden') : toggleViewBook.setAttribute(
      'hidden', true);
  };

  var togglePageRotateCw = function (val) {
    var togglePageRotateCw = secondaryToolbar.pageRotateCwButton;

    val ? togglePageRotateCw.removeAttribute('hidden') : togglePageRotateCw.setAttribute(
      'hidden', true);
  };

  var togglePageRotateCcw = function (val) {
    var togglePageRotateCcw = secondaryToolbar.pageRotateCcwButton;

    val ? togglePageRotateCcw.removeAttribute('hidden') : togglePageRotateCcw
      .setAttribute('hidden', true);
  };

  // 初始化处理所有按钮
  for (var k in tools) {
    var itemVal = tools[k];

    switch (k) {
      case 'viewOutline':
        toggleViewOutline(itemVal);
        break;

      case 'viewThumbnail':
        toggleViewThumbnail(itemVal);
        break;

      case 'viewAttachments':
        toggleViewAttachments(itemVal);
        break;

      case 'sidebarToggle':
        toggleSidebar(itemVal);
        break;

      case 'viewFind':
        toggleViewFind(itemVal)
        break;

      case 'firstPage':
        toggleFirstPage(itemVal);
        break;

      case 'lastPage':
        toggleLastPage(itemVal);
        break;

      case 'splitToolbarButton':
        toggleSplitToolbar(itemVal);
        break;

      case 'zoom':
        toggleZoom(itemVal);
        break;

      case 'scaleSelect':
        toggleScaleSelect(itemVal);
        break;

      case 'openFile':
        toggleOpenFile(itemVal);
        break;

      case 'closeFile':
        toggleCloseFile(itemVal);
        break;

      case 'fullScreen':
        toggleFullScreen(itemVal);
        break;

      case 'print':
        togglePrint(itemVal);
        break;

      case 'download':
        toggleDownload(itemVal);
        break;

      case 'secondaryToolbar':
        toggleSecondaryToolbar(itemVal);
        break;

      case 'viewBookmark':
        toggleViewBookMark(itemVal);
        break;

      case 'pageRotateCw':
        togglePageRotateCw(itemVal);
        break;

      case 'pageRotateCcw':
        togglePageRotateCcw(itemVal);
        break;
    }
  }

  // 监听按钮变化
  Object.defineProperties(epTools.tools, {
    'viewOutline': {
      set: function (newVal) {
        toggleViewOutline(newVal);

        val = newVal;
      },
      get: function () {
        return val;
      }
    },
    'viewThumbnail': {
      set: function (newVal) {
        toggleViewThumbnail(newVal);

        val = newVal;
      },
      get: function () {
        return val;
      }
    },
    'viewAttachments': {
      set: function (newVal) {
        toggleViewAttachments(newVal);

        val = newVal;
      },
      get: function () {
        return val;
      }
    },
    'sidebarToggle': {
      set: function (newVal) {
        toggleSidebar(newVal);

        val = newVal;
      },
      get: function () {
        return val;
      }
    },
    'viewFind': {
      set: function (newVal) {
        toggleViewFind(newVal);

        val = newVal;
      },
      get: function () {
        return val;
      }
    },
    'firstPage': {
      set: function (newVal) {
        toggleFirstPage(newVal);

        val = newVal;
      },
      get: function () {
        return val;
      }
    },
    'lastPage': {
      set: function (newVal) {
        toggleLastPage(newVal);

        val = newVal;
      },
      get: function () {
        return val;
      }
    },
    'splitToolbarButton': {
      set: function (newVal) {
        toggleSplitToolbar(newVal);

        val = newVal;
      },
      get: function () {
        return val;
      }
    },
    'zoom': {
      set: function (newVal) {
        toggleSidebar(newVal);

        val = newVal;
      },
      get: function () {
        return val;
      }
    },
    'scaleSelect': {
      set: function (newVal) {
        toggleScaleSelect(newVal);

        val = newVal;
      },
      get: function () {
        return val;
      }
    },
    'openFile': {
      set: function (newVal) {
        toggleOpenFile(newVal);

        val = newVal;
      },
      get: function () {
        return val;
      }
    },
    'closeFile': {
      set: function (newVal) {
        toggleCloseFile(newVal);

        val = newVal;
      },
      get: function () {
        return val;
      }
    },
    'fullScreen': {
      set: function (newVal) {
        toggleFullScreen(newVal);

        val = newVal;
      },
      get: function () {
        return val;
      }
    },
    'print': {
      set: function (newVal) {
        togglePrint(newVal);

        val = newVal;
      },
      get: function () {
        return val;
      }
    },
    'download': {
      set: function (newVal) {
        toggleDownload(newVal);

        val = newVal;
      },
      get: function () {
        return val;
      }
    },
    'secondaryToolbar': {
      set: function (newVal) {
        toggleSecondaryToolbar(newVal);

        val = newVal;
      },
      get: function () {
        return val;
      }
    },
    'viewBookmark': {
      set: function (newVal) {
        toggleViewBookMark(newVal);

        val = newVal;
      },
      get: function () {
        return val;
      }
    },
    'pageRotateCw': {
      set: function (newVal) {
        togglePageRotateCw(newVal);

        val = newVal;
      },
      get: function () {
        return val;
      }
    },
    'pageRotateCcw': {
      set: function (newVal) {
        togglePageRotateCcw(newVal);

        val = newVal;
      },
      get: function () {
        return val;
      }
    }
  });
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
