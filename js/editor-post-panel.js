/**
 * WordPress Authors and Groups Editor Panel
 *
 * Provides a document settings panel in the block editor for selecting
 * authors and user groups for posts and pages.
 *
 * @package wp-authors-and-groups
 */

(function (wp) {
	const { registerPlugin } = wp.plugins;
	const { PluginDocumentSettingPanel } = wp.editPost;
	const { CheckboxControl } = wp.components;
	const { useSelect, useDispatch, useRegistry } = wp.data;
	const { __ } = wp.i18n;
	const { useState, useEffect, useCallback } = wp.element;
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
		const { meta, postType } = useSelect((select) => {
			const editor = select('core/editor');
			return {
				meta: editor.getEditedPostAttribute('meta'),
				postType: editor.getCurrentPostType(),
				author: editor.getEditedPostAttribute('author'),
				postId: editor.getCurrentPostId(),
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

		// Fetch users on component mount
		useEffect(() => {
			apiFetch({
				path: '/wp/v2/users?per_page=100&orderby=name&order=asc',
			})
				.then((fetchedUsers) => {
					setUsers(Array.isArray(fetchedUsers) ? fetchedUsers : []);
					setIsLoadingUsers(false);
				})
				.catch((error) => {
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

		/**
		 * Handles toggling a user group checkbox.
		 *
		 * @param {number} groupId   The ID of the group to toggle.
		 * @param {boolean} isChecked Whether the group should be checked.
		 */
		const handleGroupToggle = useCallback((groupId, isChecked) => {
			// Get the latest meta from the store
			const currentMeta = registry.select('core/editor').getEditedPostAttribute('meta');
			const currentGroups = Array.isArray(currentMeta?.['wp_authors_and_groups_selected_groups'])
				? currentMeta['wp_authors_and_groups_selected_groups']
				: [];

			const newGroups = isChecked
				? currentGroups.includes(groupId)
					? currentGroups
					: [...currentGroups, groupId]
				: currentGroups.filter((id) => id !== groupId);

			// Save to post meta immediately
			editPost({
				meta: {
					...currentMeta,
					wp_authors_and_groups_selected_groups: newGroups,
				},
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
			const currentUsers = Array.isArray(currentMeta?.['wp_authors_and_groups_selected_users'])
				? currentMeta['wp_authors_and_groups_selected_users']
				: [];

			const newUsers = isChecked
				? currentUsers.includes(userId)
					? currentUsers
					: [...currentUsers, userId]
				: currentUsers.filter((id) => id !== userId);

			// Save to post meta immediately
			editPost({
				meta: {
					...currentMeta,
					wp_authors_and_groups_selected_users: newUsers,
				},
			});
		}, [registry, editPost]);

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
						{userGroups.length > 0 && (
							<div className="wp-authors-and-groups-section">
								<h4>{__('User Groups', 'wp-authors-and-groups')}</h4>
								<div className="wp-authors-and-groups-checkboxes">
									{userGroups.map((group) => (
										<CheckboxControl
											key={group.id}
											label={group.name}
											checked={selectedGroups.includes(group.id)}
											onChange={(checked) => handleGroupToggle(group.id, checked)}
										/>
									))}
								</div>
							</div>
						)}
						{users.length > 0 && (
							<div className="wp-authors-and-groups-section">
								<h4>{__('Users', 'wp-authors-and-groups')}</h4>
								<div className="wp-authors-and-groups-checkboxes">
									{users.map((user) => (
										<CheckboxControl
											key={user.id}
											label={user.name}
											checked={selectedUsers.includes(user.id)}
											onChange={(checked) => handleUserToggle(user.id, checked)}
										/>
									))}
								</div>
							</div>
						)}
						{userGroups.length === 0 && users.length === 0 && (
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