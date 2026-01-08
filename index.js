(function (wp) {
	const { registerPlugin } = wp.plugins;
	const { PluginDocumentSettingPanel } = wp.editPost;
	const { CheckboxControl } = wp.components;
	const { useSelect, useDispatch } = wp.data;
	const { __ } = wp.i18n;
	const { useState, useEffect, useCallback, useRef } = wp.element;
	const apiFetch = wp.apiFetch;

	const AuthorGroupsPanel = () => {
		const { meta, postType } = useSelect((select) => {
			return {
				meta: select('core/editor').getEditedPostAttribute('meta'),
				postType: select('core/editor').getCurrentPostType(),
			};
		}, []);

		// Get current selected users - expect array of user IDs
		const currentSelectedUsers = meta?.['wp_authors_and_groups_selected_users'] || [];

		// Get current selected groups - expect array of group term IDs
		const currentSelectedGroups = meta?.['wp_authors_and_groups_selected_groups'] || [];

		// State for selected user IDs
		const [selectedUsers, setSelectedUsers] = useState(
			Array.isArray(currentSelectedUsers) ? currentSelectedUsers : []
		);

		// State for selected group IDs
		const [selectedGroups, setSelectedGroups] = useState(
			Array.isArray(currentSelectedGroups) ? currentSelectedGroups : []
		);

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
					setUsers(fetchedUsers);
					setIsLoadingUsers(false);
				})
				.catch(() => {
					setIsLoadingUsers(false);
				});
		}, []);

		// Fetch user groups on component mount
		useEffect(() => {
			apiFetch({
				path: '/wp-authors-and-groups/v1/user-groups',
			})
				.then((fetchedGroups) => {
					setUserGroups(fetchedGroups);
					setIsLoadingGroups(false);
				})
				.catch(() => {
					setIsLoadingGroups(false);
				});
		}, []);

		// Handle checkbox change for groups
		const handleGroupToggle = useCallback((groupId, isChecked) => {
			setSelectedGroups((prev) => {
				if (isChecked) {
					return prev.includes(groupId) ? prev : [...prev, groupId];
				} else {
					return prev.filter((id) => id !== groupId);
				}
			});
		}, []);

		const handleUserToggle = useCallback((userId, isChecked) => {
			setSelectedUsers((prev) => {
				if (isChecked) {
					return prev.includes(userId) ? prev : [...prev, userId];
				} else {
					return prev.filter((id) => id !== userId);
				}
			});
		}, []);

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