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
} from '@dnd-kit/core';
import {
	SortableContext,
	horizontalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
	useUsers,
	useUserGroups,
	useSelectOptions,
	useSelectedOptions,
	useCombinedChange,
	useDefaultAuthor,
	useDragAndDrop,
} from './hooks.js';
import { DraggableMultiValue } from './components.js';

const { registerPlugin } = wp.plugins;
const { PluginDocumentSettingPanel } = wp.editPost;
const { useSelect } = wp.data;
const { __ } = wp.i18n;

/**
 * Author Groups Panel Component
 *
 * Renders a document settings panel with a grouped react-select dropdown for selecting
 * user groups and individual users as authors, with drag-and-drop reordering.
 *
 * @return {JSX.Element|null} The panel component or null if not applicable.
 */
const AuthorGroupsPanel = () => {
	const { meta, postType } = useSelect((select) => {
		const editor = select('core/editor');
		return {
			meta: editor.getEditedPostAttribute('meta'),
			postType: editor.getCurrentPostType(),
		};
	}, []);

	// Use custom hooks
	const { users, isLoadingUsers } = useUsers();
	const { userGroups, isLoadingGroups } = useUserGroups();
	const { groupOptions, userOptions, groupedOptions } = useSelectOptions(users, userGroups);
	const selectedOptions = useSelectedOptions(meta, groupOptions, userOptions);
	const handleCombinedChange = useCombinedChange();
	const { sensors, handleDragEnd } = useDragAndDrop(selectedOptions, handleCombinedChange);

	// Set default author on mount
	useDefaultAuthor();

	// Only show for supported post types
	const supportedPostTypes = wpAuthorsAndGroups?.supportedPostTypes || ['post'];
	if (!supportedPostTypes.includes(postType)) {
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
