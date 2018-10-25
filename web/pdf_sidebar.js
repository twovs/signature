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

import {
  NullL10n
} from './ui_utils';
import {
  RenderingStates
} from './pdf_rendering_queue';

const UI_NOTIFICATION_CLASS = 'pdfSidebarNotification';

const SidebarView = {
  NONE: 0,
  THUMBS: 1,
  OUTLINE: 2,
  ATTACHMENTS: 3,
  ANNOTATION: 4
};

/**
 * @typedef {Object} PDFSidebarOptions
 * @property {PDFViewer} pdfViewer - The document viewer.
 * @property {PDFThumbnailViewer} pdfThumbnailViewer - The thumbnail viewer.
 * @property {PDFOutlineViewer} pdfOutlineViewer - The outline viewer.
 * @property {HTMLDivElement} mainContainer - The main container
 *   (in which the viewer element is placed).
 * @property {HTMLDivElement} outerContainer - The outer container
 *   (encasing both the viewer and sidebar elements).
 * @property {EventBus} eventBus - The application event bus.
 *   opening/closing the sidebar.
 * @property {HTMLButtonElement} thumbnailButton - The button used to show
 *   the thumbnail view.
 * @property {HTMLButtonElement} outlineButton - The button used to show
 *   the outline view.
 * @property {HTMLButtonElement} attachmentsButton - The button used to show
 *   the attachments view.
 * @property {HTMLDivElement} thumbnailView - The container in which
 *   the thumbnails are placed.
 * @property {HTMLDivElement} outlineView - The container in which
 *   the outline is placed.
 * @property {HTMLDivElement} attachmentsView - The container in which
 *   the attachments are placed.
 * @property {boolean} disableNotification - (optional) Disable the notification
 *   for documents containing outline/attachments. The default value is `false`.
 */

class PDFSidebar {
  /**
   * @param {PDFSidebarOptions} options
   * @param {IL10n} l10n - Localization service.
   */
  constructor(options, l10n = NullL10n) {
    this.isOpen = false;
    this.active = SidebarView.THUMBS;
    this.isInitialViewSet = false;

    /**
     * Callback used when the sidebar has been opened/closed, to ensure that
     * the viewers (PDFViewer/PDFThumbnailViewer) are updated correctly.
     */
    this.onToggled = null;

    this.pdfViewer = options.pdfViewer;
    this.pdfThumbnailViewer = options.pdfThumbnailViewer;
    this.pdfOutlineViewer = options.pdfOutlineViewer;

    this.mainContainer = options.mainContainer;
    this.outerContainer = options.outerContainer;
    this.eventBus = options.eventBus;

    this.thumbnailView = options.thumbnailView;
    this.outlineView = options.outlineView;
    this.annotationView = options.annotationView;
    this.attachmentsView = options.attachmentsView;

    this.disableNotification = options.disableNotification || false;

    this.l10n = l10n;

    this._addEventListeners();
  }

  reset() {
    this.isInitialViewSet = false;

    this._hideUINotification(null);
    this.switchView(SidebarView.THUMBS);
  }

  /**
   * @returns {number} One of the values in {SidebarView}.
   */
  get visibleView() {
    return (this.isOpen ? this.active : SidebarView.NONE);
  }

  get isThumbnailViewVisible() {
    return (this.isOpen && this.active === SidebarView.THUMBS);
  }

  get isOutlineViewVisible() {
    return (this.isOpen && this.active === SidebarView.OUTLINE);
  }
  
  get isAnnotationViewVisible() {
    return (this.isOpen && this.active === SidebarView.ANNOTATION);
  }

  get isAttachmentsViewVisible() {
    return (this.isOpen && this.active === SidebarView.ATTACHMENTS);
  }

  /**
   * @param {number} view - The sidebar view that should become visible,
   *                        must be one of the values in {SidebarView}.
   */
  setInitialView(view = SidebarView.NONE) {
    if (this.isInitialViewSet) {
      return;
    }
    this.isInitialViewSet = true;

    if (this.isOpen && view === SidebarView.NONE) {
      this._dispatchEvent();
      // If the user has already manually opened the sidebar,
      // immediately closing it would be bad UX.
      return;
    }
    let isViewPreserved = (view === this.visibleView);
    this.switchView(view, /* forceOpen */ true);

    if (isViewPreserved) {
      // Prevent dispatching two back-to-back `sidebarviewchanged` events,
      // since `this.switchView` dispatched the event if the view changed.
      this._dispatchEvent();
    }
  }

  /**
   * @param {number} view - The sidebar view that should be switched to,
   *                        must be one of the values in {SidebarView}.
   * @param {boolean} forceOpen - (optional) Ensure that the sidebar is open.
   *                              The default value is `false`.
   */
  switchView(view, forceOpen = false) {
    if (view === SidebarView.NONE) {
      this.close();
      return;
    }
    let isViewChanged = (view !== this.active);
    let shouldForceRendering = false;

    switch (view) {
      case SidebarView.THUMBS:
        if (!PDFViewerApplication.pdfSidebar.isOpen) {
          PDFViewerApplication.pdfSidebar.toggle();
        } else {
          if (PDFViewerApplication.pdfSidebar.isThumbnailViewVisible) {
            PDFViewerApplication.pdfSidebar.toggle();
          }
        }

        this.thumbnailView.classList.remove('hidden');
        this.outlineView.classList.add('hidden');
        this.attachmentsView.classList.add('hidden');

        if (this.isOpen && isViewChanged) {
          this._updateThumbnailViewer();
          shouldForceRendering = true;
        }
        break;
      case SidebarView.OUTLINE:
        if (!PDFViewerApplication.pdfSidebar.isOpen) {
          PDFViewerApplication.pdfSidebar.toggle();
        } else {
          if (PDFViewerApplication.pdfSidebar.isOutlineViewVisible) {
            PDFViewerApplication.pdfSidebar.toggle();
          }
        }

        this.thumbnailView.classList.add('hidden');
        this.outlineView.classList.remove('hidden');
        this.attachmentsView.classList.add('hidden');
        this.annotationView.classList.add('hidden');
        break;
      case SidebarView.ATTACHMENTS:
        if (!PDFViewerApplication.pdfSidebar.isOpen) {
          PDFViewerApplication.pdfSidebar.toggle();
        } else {
          if (PDFViewerApplication.pdfSidebar.isAttachmentsViewVisible) {
            PDFViewerApplication.pdfSidebar.toggle();
          } else {
          }
        }

        this.thumbnailView.classList.add('hidden');
        this.outlineView.classList.add('hidden');
        this.annotationView.classList.add('hidden');
        this.attachmentsView.classList.remove('hidden');
        break;
      case SidebarView.ANNOTATION:
        if (!PDFViewerApplication.pdfSidebar.isOpen) {
          PDFViewerApplication.pdfSidebar.toggle();
        } else {
          if (PDFViewerApplication.pdfSidebar.isOutlineViewVisible) {
            PDFViewerApplication.pdfSidebar.toggle();
          }
        }
        
        this.thumbnailView.classList.add('hidden');
        this.outlineView.classList.add('hidden');
        this.annotationView.classList.remove('hidden');
        this.attachmentsView.classList.add('hidden');
        break;
      default:
        console.error('PDFSidebar_switchView: "' + view +
          '" is an unsupported value.');
        return;
    }
    // Update the active view *after* it has been validated above,
    // in order to prevent setting it to an invalid state.
    this.active = view | 0;

    if (forceOpen && !this.isOpen) {
      this.open();
      return; // NOTE: Opening will trigger rendering, and dispatch the event.
    }
    if (shouldForceRendering) {
      this._forceRendering();
    }
    if (isViewChanged) {
      this._dispatchEvent();
    }
    this._hideUINotification(this.active);
  }

  open() {
    if (this.isOpen) {
      return;
    }
    this.isOpen = true;

    this.outerContainer.classList.add('sidebarMoving');
    this.outerContainer.classList.add('sidebarOpen');

    if (this.active === SidebarView.THUMBS) {
      this._updateThumbnailViewer();
    }
    this._forceRendering();
    this._dispatchEvent();

    this._hideUINotification(this.active);
  }

  close() {
    if (!this.isOpen) {
      return;
    }
    this.isOpen = false;

    this.outerContainer.classList.add('sidebarMoving');
    this.outerContainer.classList.remove('sidebarOpen');

    this._forceRendering();
    this._dispatchEvent();
  }

  toggle() {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  /**
   * @private
   */
  _dispatchEvent() {
    this.eventBus.dispatch('sidebarviewchanged', {
      source: this,
      view: this.visibleView,
    });
  }

  /**
   * @private
   */
  _forceRendering() {
    if (this.onToggled) {
      this.onToggled();
    } else { // Fallback
      this.pdfViewer.forceRendering();
      this.pdfThumbnailViewer.forceRendering();
    }
  }

  /**
   * @private
   */
  _updateThumbnailViewer() {
    let {
      pdfViewer,
      pdfThumbnailViewer,
    } = this;

    // Use the rendered pages to set the corresponding thumbnail images.
    let pagesCount = pdfViewer.pagesCount;
    for (let pageIndex = 0; pageIndex < pagesCount; pageIndex++) {
      let pageView = pdfViewer.getPageView(pageIndex);
      if (pageView && pageView.renderingState === RenderingStates.FINISHED) {
        let thumbnailView = pdfThumbnailViewer.getThumbnail(pageIndex);
        thumbnailView.setImage(pageView);
      }
    }
    pdfThumbnailViewer.scrollThumbnailIntoView(pdfViewer.currentPageNumber);
  }

  /**
   * @private
   */
  _showUINotification(view) {
    if (this.disableNotification) {
      return;
    }

    this.l10n.get('toggle_sidebar_notification.title', null,
      'Toggle Sidebar (document contains outline/attachments)').
    then((msg) => {
    });

    if (!this.isOpen) {
      // currently closed, to avoid unnecessarily bothering the user.
    } else if (view === this.active) {
      // If the sidebar is currently open *and* the `view` is visible, do not
      // bother the user with a notification on the corresponding button.
      return;
    }

    switch (view) {
      case SidebarView.OUTLINE:
        break;
      case SidebarView.ATTACHMENTS:
        break;
    }
  }

  /**
   * @private
   */
  _hideUINotification(view) {
    if (this.disableNotification) {
      return;
    }

    let removeNotification = (view) => {
      switch (view) {
        case SidebarView.OUTLINE:
          break;
        case SidebarView.ATTACHMENTS:
          break;
      }
    };

    if (!this.isOpen && view !== null) {
      // Only hide the notifications when the sidebar is currently open,
      // or when it is being reset (i.e. `view === null`).
      return;
    }

    if (view !== null) {
      removeNotification(view);
      return;
    }
    for (view in SidebarView) { // Remove all sidebar notifications on reset.
      removeNotification(SidebarView[view]);
    }

    this.l10n.get('toggle_sidebar.title', null, 'Toggle Sidebar').
    then((msg) => {
    });
  }

  /**
   * @private
   */
  _addEventListeners() {
    this.mainContainer.addEventListener('transitionend', (evt) => {
      if (evt.target === this.mainContainer) {
        this.outerContainer.classList.remove('sidebarMoving');
      }
    });

    // Disable/enable views.
    this.eventBus.on('outlineloaded', (evt) => {
      let outlineCount = evt.outlineCount;

      if (outlineCount) {
        this._showUINotification(SidebarView.OUTLINE);
      } else if (this.active === SidebarView.OUTLINE) {
        // If the outline view was opened during document load, switch away
        // from it if it turns out that the document has no outline.
        this.switchView(SidebarView.THUMBS);
      }
    });

    this.eventBus.on('attachmentsloaded', (evt) => {
      if (evt.attachmentsCount) {

        this._showUINotification(SidebarView.ATTACHMENTS);
        return;
      }

      // Attempt to avoid temporarily disabling, and switching away from, the
      // attachment view for documents that do not contain proper attachments
      // but *only* FileAttachment annotations. Hence we defer those operations
      // slightly to allow time for parsing any FileAttachment annotations that
      // may be present on the *initially* rendered page of the document.
      Promise.resolve().then(() => {
        if (this.attachmentsView.hasChildNodes()) {
          // FileAttachment annotations were appended to the attachment view.
          return;
        }

        if (this.active === SidebarView.ATTACHMENTS) {
          // If the attachment view was opened during document load, switch away
          // from it if it turns out that the document has no attachments.
          this.switchView(SidebarView.THUMBS);
        }
      });
    });

    // Update the thumbnailViewer, if visible, when exiting presentation mode.
    this.eventBus.on('presentationmodechanged', (evt) => {
      if (!evt.active && !evt.switchInProgress && this.isThumbnailViewVisible) {
        this._updateThumbnailViewer();
      }
    });
  }
}

export {
  SidebarView,
  PDFSidebar,
};
