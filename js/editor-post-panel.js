/**
 * WordPress Authors and Groups Editor Panel
 *
 * Provides a document settings panel in the block editor for selecting
 * authors and user groups for posts and pages.
 *
 * @package wp-authors-and-groups
 */

import Select from 'react-select';
import {
	DndContext,
	closestCenter,
	KeyboardSensor,
	PointerSensor,
	useSensor,
	useSensors,
} from '@dnd-kit/core';
import {
	arrayMove,
	SortableContext,
	sortableKeyboardCoordinates,
	useSortable,
	horizontalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

(function (wp) {
	const { registerPlugin } = wp.plugins;
	const { PluginDocumentSettingPanel } = wp.editPost;
	const { useSelect, useDispatch, useRegistry } = wp.data;
	const { __ } = wp.i18n;
	const { useState, useEffect, useCallback, useMemo } = wp.element;
	const apiFetch = wp.apiFetch;

	/**
	 * Draggable MultiValue Component for react-select
	 *
	 * Makes the selected items in react-select draggable.
	 *
	 * @param {Object} props Component props from react-select.
	 * @return {JSX.Element} The draggable multi-value component.
	 */
	const DraggableMultiValue = (props) => {
		const {
			attributes,
			listeners,
			setNodeRef,
			transform,
			transition,
			isDragging,
		} = useSortable({ id: props.data.value });

		const containerStyle = {
			transform: CSS.Transform.toString(transform),
			transition,
			opacity: isDragging ? 0.5 : 1,
			// Ensure background is applied with light grey
			backgroundColor: '#f0f0f1',
			color: '#2c3338',
			padding: '6px 10px',
			margin: '2px 4px 2px 0',
			borderRadius: '4px',
			border: '1px solid #dcdcde',
			display: 'flex',
			alignItems: 'center',
			gap: '6px',
			boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
		};

		// Drag handle style - only this area is draggable
		const dragHandleStyle = {
			cursor: isDragging ? 'grabbing' : 'grab',
			display: 'flex',
			alignItems: 'center',
			padding: '0 4px',
			marginRight: '4px',
			color: '#646970',
		};

		// Preserve react-select's default MultiValue structure
		// Apply drag listeners only to a drag handle, not the entire item
		// props.children already contains the label, so we just render it directly
		return (
			<div
				ref={setNodeRef}
				style={containerStyle}
				{...attributes}
			>
				{/* Drag handle - only this area triggers dragging */}
				<span
					{...listeners}
					style={dragHandleStyle}
					aria-label={__('Drag to reorder', 'wp-authors-and-groups')}
				>
					<svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
						<circle cx="2" cy="2" r="1"/>
						<circle cx="6" cy="2" r="1"/>
						<circle cx="10" cy="2" r="1"/>
						<circle cx="2" cy="6" r="1"/>
						<circle cx="6" cy="6" r="1"/>
						<circle cx="10" cy="6" r="1"/>
						<circle cx="2" cy="10" r="1"/>
						<circle cx="6" cy="10" r="1"/>
						<circle cx="10" cy="10" r="1"/>
					</svg>
				</span>
				{/* Label - props.children already contains the rendered label */}
				{props.children}
				{/* Remove button - use removeProps from react-select for proper removal */}
				{props.removeProps && (
					<button
						className="wp-authors-and-groups-select__multi-value__remove"
						{...props.removeProps}
						onMouseDown={(e) => {
							// Prevent drag from starting when clicking remove button
							e.stopPropagation();
						}}
						onClick={(e) => {
							// Prevent any drag handlers from interfering
							e.stopPropagation();
							// Call the original remove handler
							if (props.removeProps.onClick) {
								props.removeProps.onClick(e);
							}
						}}
						aria-label={__('Remove', 'wp-authors-and-groups')}
					>
						×
					</button>
				)}
			</div>
		);
	};


	/**
	 * Author Groups Panel Component
	 *
	 * Renders a document settings panel with a grouped react-select dropdown for selecting
	 * user groups and individual users as authors, with drag-and-drop reordering.
	 *
	 * @return {JSX.Element|null} The panel component or null if not applicable.
	 */
	const AuthorGroupsPanel = () => {
		const registry = useRegistry();
		const { meta, postType } = useSelect((select) => {
			const editor = select('core/editor');
			return {
				meta: editor.getEditedPostAttribute('meta'),
				postType: editor.getCurrentPostType(),
			};
		}, []);

		const { editPost } = useDispatch('core/editor');

		// Get current selected users - expect array of user IDs
		const selectedUsers = Array.isArray(meta?.['wp_authors_and_groups_selected_users'])
			? meta['wp_authors_and_groups_selected_users']
			: [];

		// Get current selected groups - expect array of group term IDs
		const selectedGroups = Array.isArray(meta?.['wp_authors_and_groups_selected_groups'])
			? meta['wp_authors_and_groups_selected_groups']
			: [];

		// State for users list
		const [users, setUsers] = useState([]);
		const [isLoadingUsers, setIsLoadingUsers] = useState(true);

		// State for user groups list
		const [userGroups, setUserGroups] = useState([]);
		const [isLoadingGroups, setIsLoadingGroups] = useState(true);

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

		/**
		 * Handles combined selection change from react-select.
		 * Parses prefixed values to separate users and groups and preserves order.
		 *
		 * @param {Array} selectedOptions Array of selected option objects from react-select.
		 */
		const handleCombinedChange = useCallback((selectedOptions) => {
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


		// Fetch users on component mount
		useEffect(() => {
			apiFetch({
				path: '/wp/v2/users?per_page=100&orderby=name&order=asc',
			})
				.then((fetchedUsers) => {
					setUsers(Array.isArray(fetchedUsers) ? fetchedUsers : []);
					setIsLoadingUsers(false);
				})
				.catch(() => {
					// Silently handle error - users list will remain empty
					setIsLoadingUsers(false);
				});
		}, []);

		// Fetch user groups on component mount
		useEffect(() => {
			apiFetch({
				path: '/wp-authors-and-groups/v1/user-groups',
			})
				.then((fetchedGroups) => {
					setUserGroups(Array.isArray(fetchedGroups) ? fetchedGroups : []);
					setIsLoadingGroups(false);
				})
				.catch(() => {
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
			const metaUsers = Array.isArray(currentMeta?.['wp_authors_and_groups_selected_users'])
				? currentMeta['wp_authors_and_groups_selected_users']
				: [];
			const metaGroups = Array.isArray(currentMeta?.['wp_authors_and_groups_selected_groups'])
				? currentMeta['wp_authors_and_groups_selected_groups']
				: [];

			// If both are empty and we have an author, set the author as default
			if (metaUsers.length === 0 && metaGroups.length === 0) {
				const authorId = parseInt(currentAuthor, 10);

				// Only set if we have a valid author ID
				if (authorId && !isNaN(authorId)) {
					editPost({
						meta: {
							...currentMeta,
							wp_authors_and_groups_selected_users: [authorId],
						},
					});
				}
			}
			// eslint-disable-next-line react-hooks/exhaustive-deps
		}, []); // Empty dependency array - only runs on mount

		// Only show for posts and pages
		if (postType !== 'post' && postType !== 'page') {
			return null;
		}

		const isLoading = isLoadingUsers || isLoadingGroups;

		return (
			<PluginDocumentSettingPanel
				name="wp-authors-and-groups-panel"
				title={__('Authors and Groups', 'wp-authors-and-groups')}
				className="wp-authors-and-groups-panel"
				initialOpen={true}
			>
				{isLoading ? (
					<p>{__('Loading...', 'wp-authors-and-groups')}</p>
				) : (
					<>
						{groupedOptions.length > 0 ? (
							<div className="wp-authors-and-groups-section">
								<DndContext
									sensors={sensors}
									collisionDetection={closestCenter}
									onDragEnd={handleDragEnd}
								>
									<SortableContext
										items={selectedOptions.map((opt) => opt.value)}
										strategy={horizontalListSortingStrategy}
									>
										<Select
											isMulti
											options={groupedOptions}
											value={selectedOptions}
											onChange={handleCombinedChange}
											placeholder={__('Select users and groups...', 'wp-authors-and-groups')}
											className="wp-authors-and-groups-select"
											classNamePrefix="wp-authors-and-groups-select"
											isSearchable={false}
											isClearable={false}
											components={{
												MultiValue: DraggableMultiValue,
											}}
										/>
									</SortableContext>
								</DndContext>
							</div>
						) : (
							<p>{__('No user groups or users found.', 'wp-authors-and-groups')}</p>
						)}
					</>
				)}
			</PluginDocumentSettingPanel>
		);
	};

	registerPlugin('wp-authors-and-groups', {
		render: AuthorGroupsPanel,
		icon: 'groups',
	});
})(window.wp);