/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ "./js/editor-post-panel.js"
/*!*********************************!*\
  !*** ./js/editor-post-panel.js ***!
  \*********************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony import */ var react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react/jsx-runtime */ "react/jsx-runtime");
/* harmony import */ var react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__);

/**
 * WordPress Authors and Groups Editor Panel
 *
 * Provides a document settings panel in the block editor for selecting
 * authors and user groups for posts and pages.
 *
 * @package wp-authors-and-groups
 */

(function (wp) {
  const {
    registerPlugin
  } = wp.plugins;
  const {
    PluginDocumentSettingPanel
  } = wp.editPost;
  const {
    CheckboxControl
  } = wp.components;
  const {
    useSelect,
    useDispatch,
    useRegistry
  } = wp.data;
  const {
    __
  } = wp.i18n;
  const {
    useState,
    useEffect,
    useCallback
  } = wp.element;
  const apiFetch = wp.apiFetch;

  /**
   * Author Groups Panel Component
   *
   * Renders a document settings panel with checkboxes for selecting
   * user groups and individual users as authors.
   *
   * @return {JSX.Element|null} The panel component or null if not applicable.
   */
  const AuthorGroupsPanel = () => {
    const registry = useRegistry();
    const {
      meta,
      postType
    } = useSelect(select => {
      const editor = select('core/editor');
      return {
        meta: editor.getEditedPostAttribute('meta'),
        postType: editor.getCurrentPostType(),
        author: editor.getEditedPostAttribute('author'),
        postId: editor.getCurrentPostId()
      };
    }, []);
    const {
      editPost
    } = useDispatch('core/editor');

    // Get current selected users - expect array of user IDs
    const selectedUsers = Array.isArray(meta?.['wp_authors_and_groups_selected_users']) ? meta['wp_authors_and_groups_selected_users'] : [];

    // Get current selected groups - expect array of group term IDs
    const selectedGroups = Array.isArray(meta?.['wp_authors_and_groups_selected_groups']) ? meta['wp_authors_and_groups_selected_groups'] : [];

    // State for users list
    const [users, setUsers] = useState([]);
    const [isLoadingUsers, setIsLoadingUsers] = useState(true);

    // State for user groups list
    const [userGroups, setUserGroups] = useState([]);
    const [isLoadingGroups, setIsLoadingGroups] = useState(true);

    // Fetch users on component mount
    useEffect(() => {
      apiFetch({
        path: '/wp/v2/users?per_page=100&orderby=name&order=asc'
      }).then(fetchedUsers => {
        setUsers(Array.isArray(fetchedUsers) ? fetchedUsers : []);
        setIsLoadingUsers(false);
      }).catch(error => {
        // Silently handle error - users list will remain empty
        setIsLoadingUsers(false);
      });
    }, []);

    // Fetch user groups on component mount
    useEffect(() => {
      apiFetch({
        path: '/wp-authors-and-groups/v1/user-groups'
      }).then(fetchedGroups => {
        setUserGroups(Array.isArray(fetchedGroups) ? fetchedGroups : []);
        setIsLoadingGroups(false);
      }).catch(() => {
        // Silently handle error - groups list will remain empty
        setIsLoadingGroups(false);
      });
    }, []);

    // Default to post author if both selected users and groups are empty (only on mount)
    // Note: Intentionally using empty dependency array to run only once on mount.
    // registry and editPost are stable references from hooks and don't need to be in deps.
    useEffect(() => {
      // Get current values from store
      const currentMeta = registry.select('core/editor').getEditedPostAttribute('meta');
      const currentAuthor = registry.select('core/editor').getEditedPostAttribute('author');
      const currentPostId = registry.select('core/editor').getCurrentPostId();

      // Don't run if we don't have author or postId
      if (!currentAuthor || !currentPostId) {
        return;
      }

      // Get current meta values
      const metaUsers = Array.isArray(currentMeta?.['wp_authors_and_groups_selected_users']) ? currentMeta['wp_authors_and_groups_selected_users'] : [];
      const metaGroups = Array.isArray(currentMeta?.['wp_authors_and_groups_selected_groups']) ? currentMeta['wp_authors_and_groups_selected_groups'] : [];

      // If both are empty and we have an author, set the author as default
      if (metaUsers.length === 0 && metaGroups.length === 0) {
        const authorId = parseInt(currentAuthor, 10);

        // Only set if we have a valid author ID
        if (authorId && !isNaN(authorId)) {
          editPost({
            meta: {
              ...currentMeta,
              wp_authors_and_groups_selected_users: [authorId]
            }
          });
        }
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Empty dependency array - only runs on mount

    /**
     * Handles toggling a user group checkbox.
     *
     * @param {number} groupId   The ID of the group to toggle.
     * @param {boolean} isChecked Whether the group should be checked.
     */
    const handleGroupToggle = useCallback((groupId, isChecked) => {
      // Get the latest meta from the store
      const currentMeta = registry.select('core/editor').getEditedPostAttribute('meta');
      const currentGroups = Array.isArray(currentMeta?.['wp_authors_and_groups_selected_groups']) ? currentMeta['wp_authors_and_groups_selected_groups'] : [];
      const newGroups = isChecked ? currentGroups.includes(groupId) ? currentGroups : [...currentGroups, groupId] : currentGroups.filter(id => id !== groupId);

      // Save to post meta immediately
      editPost({
        meta: {
          ...currentMeta,
          wp_authors_and_groups_selected_groups: newGroups
        }
      });
    }, [registry, editPost]);

    /**
     * Handles toggling a user checkbox.
     *
     * @param {number} userId    The ID of the user to toggle.
     * @param {boolean} isChecked Whether the user should be checked.
     */
    const handleUserToggle = useCallback((userId, isChecked) => {
      // Get the latest meta from the store
      const currentMeta = registry.select('core/editor').getEditedPostAttribute('meta');
      const currentUsers = Array.isArray(currentMeta?.['wp_authors_and_groups_selected_users']) ? currentMeta['wp_authors_and_groups_selected_users'] : [];
      const newUsers = isChecked ? currentUsers.includes(userId) ? currentUsers : [...currentUsers, userId] : currentUsers.filter(id => id !== userId);

      // Save to post meta immediately
      editPost({
        meta: {
          ...currentMeta,
          wp_authors_and_groups_selected_users: newUsers
        }
      });
    }, [registry, editPost]);

    // Only show for posts and pages
    if (postType !== 'post' && postType !== 'page') {
      return null;
    }
    const isLoading = isLoadingUsers || isLoadingGroups;
    return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)(PluginDocumentSettingPanel, {
      name: "wp-authors-and-groups-panel",
      title: __('Authors and Groups', 'wp-authors-and-groups'),
      className: "wp-authors-and-groups-panel",
      initialOpen: true,
      children: isLoading ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)("p", {
        children: __('Loading...', 'wp-authors-and-groups')
      }) : /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxs)(react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.Fragment, {
        children: [userGroups.length > 0 && /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxs)("div", {
          className: "wp-authors-and-groups-section",
          children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)("h4", {
            children: __('User Groups', 'wp-authors-and-groups')
          }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)("div", {
            className: "wp-authors-and-groups-checkboxes",
            children: userGroups.map(group => /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)(CheckboxControl, {
              label: group.name,
              checked: selectedGroups.includes(group.id),
              onChange: checked => handleGroupToggle(group.id, checked)
            }, group.id))
          })]
        }), users.length > 0 && /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxs)("div", {
          className: "wp-authors-and-groups-section",
          children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)("h4", {
            children: __('Users', 'wp-authors-and-groups')
          }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)("div", {
            className: "wp-authors-and-groups-checkboxes",
            children: users.map(user => /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)(CheckboxControl, {
              label: user.name,
              checked: selectedUsers.includes(user.id),
              onChange: checked => handleUserToggle(user.id, checked)
            }, user.id))
          })]
        }), userGroups.length === 0 && users.length === 0 && /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)("p", {
          children: __('No user groups or users found.', 'wp-authors-and-groups')
        })]
      })
    });
  };
  registerPlugin('wp-authors-and-groups', {
    render: AuthorGroupsPanel,
    icon: 'groups'
  });
})(window.wp);

/***/ },

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
/*!**********************!*\
  !*** ./js/editor.js ***!
  \**********************/
__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _editor_post_panel_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./editor-post-panel.js */ "./js/editor-post-panel.js");

})();

/******/ })()
;
//# sourceMappingURL=editor.js.map