/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ "react/jsx-runtime"
/*!**********************************!*\
  !*** external "ReactJSXRuntime" ***!
  \**********************************/
(module) {

module.exports = window["ReactJSXRuntime"];

/***/ }

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Check if module exists (development only)
/******/ 		if (__webpack_modules__[moduleId] === undefined) {
/******/ 			var e = new Error("Cannot find module '" + moduleId + "'");
/******/ 			e.code = 'MODULE_NOT_FOUND';
/******/ 			throw e;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/compat get default export */
/******/ 	(() => {
/******/ 		// getDefaultExport function for compatibility with non-harmony modules
/******/ 		__webpack_require__.n = (module) => {
/******/ 			var getter = module && module.__esModule ?
/******/ 				() => (module['default']) :
/******/ 				() => (module);
/******/ 			__webpack_require__.d(getter, { a: getter });
/******/ 			return getter;
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/define property getters */
/******/ 	(() => {
/******/ 		// define getter functions for harmony exports
/******/ 		__webpack_require__.d = (exports, definition) => {
/******/ 			for(var key in definition) {
/******/ 				if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__webpack_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	(() => {
/******/ 		// define __esModule on exports
/******/ 		__webpack_require__.r = (exports) => {
/******/ 			if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 				Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 			}
/******/ 			Object.defineProperty(exports, '__esModule', { value: true });
/******/ 		};
/******/ 	})();
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};
// This entry needs to be wrapped in an IIFE because it needs to be isolated against other modules in the chunk.
(() => {
/*!******************!*\
  !*** ./index.js ***!
  \******************/
__webpack_require__.r(__webpack_exports__);
/* harmony import */ var react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react/jsx-runtime */ "react/jsx-runtime");
/* harmony import */ var react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__);

(function (wp) {
  const {
    registerPlugin
  } = wp.plugins;
  const {
    PluginDocumentSettingPanel
  } = wp.editPost;
  const {
    TextControl
  } = wp.components;
  const {
    useSelect,
    useDispatch
  } = wp.data;
  const {
    __
  } = wp.i18n;
  const {
    useState,
    useEffect
  } = wp.element;
  const AuthorGroupsPanel = () => {
    const {
      meta,
      postType
    } = useSelect(select => {
      return {
        meta: select('core/editor').getEditedPostAttribute('meta'),
        postType: select('core/editor').getCurrentPostType()
      };
    }, []);
    const {
      editPost
    } = useDispatch('core/editor');

    // Get current meta value
    const currentMetaValue = meta?.['wp_authors_and_groups_dummy_setting'] || '';

    // Dummy setting value - initialize from meta or use default
    const [dummySetting, setDummySetting] = useState(currentMetaValue);

    // Sync state when meta changes (e.g., when loading a different post)
    useEffect(() => {
      setDummySetting(currentMetaValue);
    }, [currentMetaValue]);

    // Update meta when dummy setting changes
    useEffect(() => {
      if (currentMetaValue !== dummySetting) {
        editPost({
          meta: {
            ...meta,
            wp_authors_and_groups_dummy_setting: dummySetting
          }
        });
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dummySetting]);

    // Only show for posts and pages
    if (postType !== 'post' && postType !== 'page') {
      return null;
    }
    return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)(PluginDocumentSettingPanel, {
      name: "wp-authors-and-groups-panel",
      title: __('Authors and Groups', 'wp-authors-and-groups'),
      className: "wp-authors-and-groups-panel",
      initialOpen: true,
      children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)(TextControl, {
        label: __('Dummy Setting', 'wp-authors-and-groups'),
        value: dummySetting,
        onChange: value => setDummySetting(value),
        help: __('This is a dummy setting for testing purposes.', 'wp-authors-and-groups')
      })
    });
  };
  registerPlugin('wp-authors-and-groups', {
    render: AuthorGroupsPanel,
    icon: 'groups'
  });
})(window.wp);
})();

/******/ })()
;
//# sourceMappingURL=index.js.map