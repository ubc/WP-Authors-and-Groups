(function (wp) {
	const { registerPlugin } = wp.plugins;
	const { PluginDocumentSettingPanel } = wp.editPost;
	const { TextControl } = wp.components;
	const { useSelect, useDispatch } = wp.data;
	const { __ } = wp.i18n;
	const { useState, useEffect } = wp.element;

	const AuthorGroupsPanel = () => {
		const { meta, postType } = useSelect((select) => {
			return {
				meta: select('core/editor').getEditedPostAttribute('meta'),
				postType: select('core/editor').getCurrentPostType(),
			};
		}, []);

		const { editPost } = useDispatch('core/editor');

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
						wp_authors_and_groups_dummy_setting: dummySetting,
					},
				});
			}
			// eslint-disable-next-line react-hooks/exhaustive-deps
		}, [dummySetting]);

		// Only show for posts and pages
		if (postType !== 'post' && postType !== 'page') {
			return null;
		}

		return (
			<PluginDocumentSettingPanel
				name="wp-authors-and-groups-panel"
				title={__('Authors and Groups', 'wp-authors-and-groups')}
				className="wp-authors-and-groups-panel"
				initialOpen={true}
			>
				<TextControl
					label={__('Dummy Setting', 'wp-authors-and-groups')}
					value={dummySetting}
					onChange={(value) => setDummySetting(value)}
					help={__('This is a dummy setting for testing purposes.', 'wp-authors-and-groups')}
				/>
			</PluginDocumentSettingPanel>
		);
	};

	registerPlugin('wp-authors-and-groups', {
		render: AuthorGroupsPanel,
		icon: 'groups',
	});
})(window.wp);