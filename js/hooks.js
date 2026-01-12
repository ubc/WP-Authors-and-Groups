/**
 * WordPress Authors and Groups Custom Hooks
 *
 * Custom React hooks for managing users, groups, and selections.
 *
 * @package wp-authors-and-groups
 */

import {
	useSensor,
	useSensors,
	PointerSensor,
	KeyboardSensor,
} from '@dnd-kit/core';
import {
	arrayMove,
	sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';

const { useState, useEffect, useCallback, useMemo } = wp.element;
const { useDispatch, useRegistry } = wp.data;
const { __ } = wp.i18n;
const apiFetch = wp.apiFetch;

/**
 * Custom hook to fetch and manage users list.
 *
 * @return {Object} Object containing users array and loading state.
 */
export const useUsers = () => {
	const [users, setUsers] = useState([]);
	const [isLoadingUsers, setIsLoadingUsers] = useState(true);

	useEffect(() => {
		const fetchUsers = async () => {
			try {
				const fetchedUsers = await apiFetch({
					path: '/wp/v2/users?per_page=100&orderby=name&order=asc',
				});
				setUsers(Array.isArray(fetchedUsers) ? fetchedUsers : []);
				setIsLoadingUsers(false);
			} catch (error) {
				// Silently handle error - users list will remain empty
				setIsLoadingUsers(false);
			}
		};

		fetchUsers();
	}, []);

	return { users, isLoadingUsers };
};

/**
 * Custom hook to fetch and manage user groups list.
 *
 * @return {Object} Object containing userGroups array and loading state.
 */
export const useUserGroups = () => {
	const [userGroups, setUserGroups] = useState([]);
	const [isLoadingGroups, setIsLoadingGroups] = useState(true);

	useEffect(() => {
		const fetchUserGroups = async () => {
			try {
				const fetchedGroups = await apiFetch({
					path: '/wp-authors-and-groups/v1/user-groups',
				});
				setUserGroups(Array.isArray(fetchedGroups) ? fetchedGroups : []);
				setIsLoadingGroups(false);
			} catch (error) {
				// Silently handle error - groups list will remain empty
				setIsLoadingGroups(false);
			}
		};

		fetchUserGroups();
	}, []);

	return { userGroups, isLoadingGroups };
};

/**
 * Custom hook to transform users and groups into react-select options.
 *
 * @param {Array} users      Array of user objects.
 * @param {Array} userGroups Array of user group objects.
 * @return {Object} Object containing groupOptions, userOptions, and groupedOptions.
 */
export const useSelectOptions = (users, userGroups) => {
	// Transform groups data for react-select with prefix
	const groupOptions = useMemo(() => {
		return userGroups.map((group) => ({
			value: `group-${group.id}`,
			label: group.name,
		}));
	}, [userGroups]);

	// Transform users data for react-select with prefix
	const userOptions = useMemo(() => {
		return users.map((user) => ({
			value: `user-${user.id}`,
			label: user.name,
		}));
	}, [users]);

	// Create grouped options for react-select
	const groupedOptions = useMemo(() => {
		const groups = [];
		
		if (userGroups.length > 0) {
			groups.push({
				label: __('User Groups', 'wp-authors-and-groups'),
				options: groupOptions,
			});
		}
		
		if (users.length > 0) {
			groups.push({
				label: __('Users', 'wp-authors-and-groups'),
				options: userOptions,
			});
		}
		
		return groups;
	}, [groupOptions, userOptions, userGroups.length, users.length]);

	return { groupOptions, userOptions, groupedOptions };
};

/**
 * Custom hook to get selected options from meta and transform them for react-select.
 *
 * @param {Object} meta         Post meta object.
 * @param {Array}  groupOptions Array of group option objects.
 * @param {Array}  userOptions  Array of user option objects.
 * @return {Array} Array of selected option objects for react-select.
 */
export const useSelectedOptions = (meta, groupOptions, userOptions) => {
	// Get current selected users - expect array of user IDs
	const selectedUsers = Array.isArray(meta?.['wp_authors_and_groups_selected_users'])
		? meta['wp_authors_and_groups_selected_users']
		: [];

	// Get current selected groups - expect array of group term IDs
	const selectedGroups = Array.isArray(meta?.['wp_authors_and_groups_selected_groups'])
		? meta['wp_authors_and_groups_selected_groups']
		: [];

	// Get stored order from meta (if available)
	const storedOrder = Array.isArray(meta?.['wp_authors_and_groups_selected_order'])
		? meta['wp_authors_and_groups_selected_order']
		: [];

	// Transform selected values for react-select (combine both users and groups with prefixes)
	// Preserve order from storedOrder if available, otherwise groups first, then users
	const selectedOptions = useMemo(() => {
		const selected = [];
		
		// If we have stored order, use it
		if (storedOrder.length > 0) {
			storedOrder.forEach((prefixedValue) => {
				if (prefixedValue.startsWith('group-')) {
					const groupId = parseInt(prefixedValue.replace('group-', ''), 10);
					const option = groupOptions.find((opt) => opt.value === `group-${groupId}`);
					if (option) {
						selected.push(option);
					}
				} else if (prefixedValue.startsWith('user-')) {
					const userId = parseInt(prefixedValue.replace('user-', ''), 10);
					const option = userOptions.find((opt) => opt.value === `user-${userId}`);
					if (option) {
						selected.push(option);
					}
				}
			});
		} else {
			// Fallback: groups first, then users
			selectedGroups.forEach((groupId) => {
				const option = groupOptions.find((opt) => opt.value === `group-${groupId}`);
				if (option) {
					selected.push(option);
				}
			});
			
			selectedUsers.forEach((userId) => {
				const option = userOptions.find((opt) => opt.value === `user-${userId}`);
				if (option) {
					selected.push(option);
				}
			});
		}
		
		return selected;
	}, [groupOptions, userOptions, selectedGroups, selectedUsers, storedOrder]);

	return selectedOptions;
};

/**
 * Custom hook to handle combined selection change.
 *
 * @return {Function} Handler function for selection changes.
 */
export const useCombinedChange = () => {
	const registry = useRegistry();
	const { editPost } = useDispatch('core/editor');

	return useCallback((selectedOptions) => {
		// Get the latest meta from the store
		const currentMeta = registry.select('core/editor').getEditedPostAttribute('meta');
		
		// Separate users and groups based on prefix, preserving order
		const newUsers = [];
		const newGroups = [];
		const newOrder = [];
		
		if (selectedOptions) {
			selectedOptions.forEach((option) => {
				const value = option.value;
				newOrder.push(value); // Store order with prefixes
				
				if (value.startsWith('user-')) {
					const userId = parseInt(value.replace('user-', ''), 10);
					if (!isNaN(userId)) {
						newUsers.push(userId);
					}
				} else if (value.startsWith('group-')) {
					const groupId = parseInt(value.replace('group-', ''), 10);
					if (!isNaN(groupId)) {
						newGroups.push(groupId);
					}
				}
			});
		}

		// Save to post meta immediately, including order
		editPost({
			meta: {
				...currentMeta,
				wp_authors_and_groups_selected_users: newUsers,
				wp_authors_and_groups_selected_groups: newGroups,
				wp_authors_and_groups_selected_order: newOrder,
			},
		});
	}, [registry, editPost]);
};

/**
 * Custom hook to set default author when both users and groups are empty.
 * Selects the current logged-in user as default.
 *
 * @return {void}
 */
export const useDefaultAuthor = () => {
	const registry = useRegistry();
	const { editPost } = useDispatch('core/editor');

	// Default selection logic when component first mounts (only on mount)
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
		const metaUsers = Array.isArray(currentMeta?.['wp_authors_and_groups_selected_users'])
			? currentMeta['wp_authors_and_groups_selected_users']
			: [];
		const metaGroups = Array.isArray(currentMeta?.['wp_authors_and_groups_selected_groups'])
			? currentMeta['wp_authors_and_groups_selected_groups']
			: [];

		// Only proceed if both are empty (nothing selected yet)
		if (metaUsers.length === 0 && metaGroups.length === 0) {
			const setDefaultSelection = async () => {
				try {
					// Get the current logged-in user (not the post author)
					const currentUser = await apiFetch({
						path: '/wp/v2/users/me',
					});
					
					const currentUserId = currentUser?.id;
					
					// Select the current logged-in user as default
					if (currentUserId) {
						const newMeta = {
							...currentMeta,
							wp_authors_and_groups_selected_users: [currentUserId],
							wp_authors_and_groups_selected_order: [`user-${currentUserId}`],
						};
						editPost({
							meta: newMeta,
						});
					} else {
						// Fallback to post author if current user is not available
						const authorId = parseInt(currentAuthor, 10);
						if (authorId && !isNaN(authorId)) {
							const newMeta = {
								...currentMeta,
								wp_authors_and_groups_selected_users: [authorId],
								wp_authors_and_groups_selected_order: [`user-${authorId}`],
							};
							editPost({ meta: newMeta });
						}
					}
				} catch (error) {
					// If API call fails, fall back to selecting post author
					const authorId = parseInt(currentAuthor, 10);
					
					if (authorId && !isNaN(authorId)) {
						const newMeta = {
							...currentMeta,
							wp_authors_and_groups_selected_users: [authorId],
							wp_authors_and_groups_selected_order: [`user-${authorId}`],
						};
						editPost({
							meta: newMeta,
						});
					}
				}
			};

			setDefaultSelection();
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []); // Empty dependency array - only runs on mount
};

/**
 * Custom hook for drag and drop functionality.
 *
 * @param {Array}    selectedOptions     Currently selected options.
 * @param {Function} handleCombinedChange Handler for selection changes.
 * @return {Object} Object containing sensors and handleDragEnd function.
 */
export const useDragAndDrop = (selectedOptions, handleCombinedChange) => {
	// Drag and drop sensors
	const sensors = useSensors(
		useSensor(PointerSensor),
		useSensor(KeyboardSensor, {
			coordinateGetter: sortableKeyboardCoordinates,
		})
	);

	/**
	 * Handles drag end event to reorder items.
	 *
	 * @param {Object} event Drag end event.
	 */
	const handleDragEnd = useCallback((event) => {
		const { active, over } = event;

		if (over && active.id !== over.id) {
			const oldIndex = selectedOptions.findIndex((item) => item.value === active.id);
			const newIndex = selectedOptions.findIndex((item) => item.value === over.id);

			const newSelectedOptions = arrayMove(selectedOptions, oldIndex, newIndex);
			handleCombinedChange(newSelectedOptions);
		}
	}, [selectedOptions, handleCombinedChange]);

	return { sensors, handleDragEnd };
};
