/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ "@wordpress/server-side-render"
/*!******************************************!*\
  !*** external ["wp","serverSideRender"] ***!
  \******************************************/
(module) {

module.exports = window["wp"]["serverSideRender"];

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
/*!*****************************!*\
  !*** ./js/block-filters.js ***!
  \*****************************/
__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _wordpress_server_side_render__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @wordpress/server-side-render */ "@wordpress/server-side-render");
/* harmony import */ var _wordpress_server_side_render__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_wordpress_server_side_render__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! react/jsx-runtime */ "react/jsx-runtime");
/* harmony import */ var react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__);
/**
 * WordPress Authors and Groups Query Loop Filter Extension
 *
 * Extends the Query Loop block to add an author filter that works with
 * the wp-author-groups plugin's custom meta fields.
 *
 * @package wp-authors-and-groups
 */



const {
  addFilter
} = wp.hooks;
const {
  PanelBody,
  SelectControl
} = wp.components;
const {
  InspectorControls,
  useBlockProps
} = wp.blockEditor;
const {
  __
} = wp.i18n;
const {
  useEffect,
  useState,
  useMemo
} = wp.element;
const apiFetch = wp.apiFetch;

/**
 * Adds the author filter control to Query Loop blocks.
 *
 * @param {Object} BlockEdit Original block edit component.
 * @return {Object} Enhanced block edit component with author filter.
 */
const withAuthorFilterOnQueryLoop = BlockEdit => {
  return props => {
    const {
      attributes,
      setAttributes,
      name
    } = props;

    // Only apply to Query Loop block
    if (name !== 'core/query') {
      return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)(BlockEdit, {
        ...props
      });
    }

    // Get query from attributes (Query Loop blocks store query in attributes.query)
    const queryContext = attributes?.query || {};

    // State for users and groups
    const [users, setUsers] = useState([]);
    const [userGroups, setUserGroups] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    // Fetch users and groups on mount
    useEffect(() => {
      const fetchData = async () => {
        try {
          // Fetch users
          const fetchedUsers = await apiFetch({
            path: '/wp/v2/users?per_page=100&orderby=name&order=asc'
          });

          // Fetch user groups
          const fetchedGroups = await apiFetch({
            path: '/wp-authors-and-groups/v1/user-groups'
          });
          setUsers(Array.isArray(fetchedUsers) ? fetchedUsers : []);
          setUserGroups(Array.isArray(fetchedGroups) ? fetchedGroups : []);
          setIsLoading(false);
        } catch (error) {
          console.error('Error fetching users/groups:', error);
          setIsLoading(false);
        }
      };
      fetchData();
    }, []);

    // Prepare options for the select control
    const filterOptions = useMemo(() => {
      const options = [{
        label: __('All Authors', 'wp-authors-and-groups'),
        value: ''
      }];

      // Add user groups first
      userGroups.forEach(group => {
        options.push({
          label: `${group.name} (${__('Group', 'wp-authors-and-groups')})`,
          value: `group-${group.id}`
        });
      });

      // Add individual users
      users.forEach(user => {
        options.push({
          label: user.name,
          value: `user-${user.id}`
        });
      });
      return options;
    }, [users, userGroups]);

    // Get current filter value
    const currentFilter = queryContext.wpAuthorsAndGroupsFilter || '';

    // Handle filter change
    const handleFilterChange = value => {
      const newQuery = {
        ...queryContext,
        wpAuthorsAndGroupsFilter: value || undefined
      };

      // Remove the property if empty to keep attributes clean
      if (!value) {
        delete newQuery.wpAuthorsAndGroupsFilter;
      }
      setAttributes({
        query: newQuery
      });
    };
    return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsxs)(react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.Fragment, {
      children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)(BlockEdit, {
        ...props
      }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)(InspectorControls, {
        children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)(PanelBody, {
          title: __('Authors and Groups Filter', 'wp-authors-and-groups'),
          initialOpen: false,
          children: isLoading ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)("p", {
            children: __('Loading...', 'wp-authors-and-groups')
          }) : /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)(SelectControl, {
            label: __('Filter by Author or Group', 'wp-authors-and-groups'),
            value: currentFilter,
            options: filterOptions,
            onChange: handleFilterChange,
            help: __('Filter posts by specific authors or user groups assigned via the Authors and Groups plugin.', 'wp-authors-and-groups')
          })
        })
      })]
    });
  };
};

// Register the filter
addFilter('editor.BlockEdit', 'wp-authors-and-groups/query-loop-filter', withAuthorFilterOnQueryLoop);

/**
 * Forces some of the core blocks to render on the server.
 *
 * @param {Object} BlockEdit Original block edit component.
 * @return {Object} Enhanced block edit component with author filter.
 */
const withForceServerRender = BlockEdit => {
  return props => {
    const {
      name,
      attributes
    } = props;

    // Only apply to Post Author block
    if (name !== 'core/post-author') {
      return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)(BlockEdit, {
        ...props
      });
    }
    const blockProps = useBlockProps();
    return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)("div", {
      ...blockProps,
      children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)((_wordpress_server_side_render__WEBPACK_IMPORTED_MODULE_0___default()), {
        block: "core/post-author",
        attributes: attributes
      })
    });
  };
};

// Register the filter
addFilter('editor.BlockEdit', 'wp-authors-and-groups/force-server-render', withForceServerRender);
})();

/******/ })()
;
//# sourceMappingURL=block-filters.js.map