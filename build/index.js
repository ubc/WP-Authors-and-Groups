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
    CheckboxControl
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
  const apiFetch = wp.apiFetch;
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

    // Get current selected users - expect array of user IDs
    const currentSelectedUsers = meta?.['wp_authors_and_groups_selected_users'] || [];

    // Get current selected groups - expect array of group term IDs
    const currentSelectedGroups = meta?.['wp_authors_and_groups_selected_groups'] || [];

    // State for selected user IDs
    const [selectedUsers, setSelectedUsers] = useState(Array.isArray(currentSelectedUsers) ? currentSelectedUsers : []);

    // State for selected group IDs
    const [selectedGroups, setSelectedGroups] = useState(Array.isArray(currentSelectedGroups) ? currentSelectedGroups : []);

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
        setUsers(fetchedUsers);
        setIsLoadingUsers(false);
      }).catch(() => {
        setIsLoadingUsers(false);
      });
    }, []);

    // Fetch user groups on component mount
    useEffect(() => {
      apiFetch({
        path: '/wp-authors-and-groups/v1/user-groups'
      }).then(fetchedGroups => {
        setUserGroups(fetchedGroups);
        setIsLoadingGroups(false);
      }).catch(() => {
        setIsLoadingGroups(false);
      });
    }, []);

    // Sync state when meta changes (e.g., when loading a different post)
    useEffect(() => {
      const metaValue = Array.isArray(currentSelectedUsers) ? currentSelectedUsers : [];
      if (JSON.stringify(metaValue) !== JSON.stringify(selectedUsers)) {
        setSelectedUsers(metaValue);
      }
    }, [currentSelectedUsers]);
    useEffect(() => {
      const metaValue = Array.isArray(currentSelectedGroups) ? currentSelectedGroups : [];
      if (JSON.stringify(metaValue) !== JSON.stringify(selectedGroups)) {
        setSelectedGroups(metaValue);
      }
    }, [currentSelectedGroups]);

    // Update meta when selected users change
    useEffect(() => {
      const currentMeta = Array.isArray(currentSelectedUsers) ? currentSelectedUsers : [];
      if (JSON.stringify(currentMeta) !== JSON.stringify(selectedUsers)) {
        editPost({
          meta: {
            ...meta,
            wp_authors_and_groups_selected_users: selectedUsers
          }
        });
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedUsers]);

    // Update meta when selected groups change
    useEffect(() => {
      const currentMeta = Array.isArray(currentSelectedGroups) ? currentSelectedGroups : [];
      if (JSON.stringify(currentMeta) !== JSON.stringify(selectedGroups)) {
        editPost({
          meta: {
            ...meta,
            wp_authors_and_groups_selected_groups: selectedGroups
          }
        });
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedGroups]);

    // Handle checkbox change for users
    const handleUserToggle = (userId, isChecked) => {
      if (isChecked) {
        setSelectedUsers([...selectedUsers, userId]);
      } else {
        setSelectedUsers(selectedUsers.filter(id => id !== userId));
      }
    };

    // Handle checkbox change for groups
    const handleGroupToggle = (groupId, isChecked) => {
      if (isChecked) {
        setSelectedGroups([...selectedGroups, groupId]);
      } else {
        setSelectedGroups(selectedGroups.filter(id => id !== groupId));
      }
    };

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
})();

/******/ })()
;
//# sourceMappingURL=index.js.map