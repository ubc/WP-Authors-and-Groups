/**
 * WordPress Authors and Groups Query Loop Filter Extension
 *
 * Extends the Query Loop block to add an author filter that works with
 * the wp-author-groups plugin's custom meta fields.
 *
 * @package wp-authors-and-groups
 */

const { addFilter } = wp.hooks;
const { PanelBody, SelectControl } = wp.components;
const { InspectorControls } = wp.blockEditor;
const { __ } = wp.i18n;
const { useEffect, useState, useMemo } = wp.element;
const apiFetch = wp.apiFetch;

/**
 * Adds the author filter control to Query Loop blocks.
 *
 * @param {Object} BlockEdit Original block edit component.
 * @return {Object} Enhanced block edit component with author filter.
 */
const withAuthorFilter = (BlockEdit) => {
	return (props) => {
		const { attributes, setAttributes, name } = props;

		// Only apply to Query Loop block
		if (name !== 'core/query') {
			return <BlockEdit {...props} />;
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
						path: '/wp/v2/users?per_page=100&orderby=name&order=asc',
					});

					// Fetch user groups
					const fetchedGroups = await apiFetch({
						path: '/wp-authors-and-groups/v1/user-groups',
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
			const options = [
				{ label: __('All Authors', 'wp-authors-and-groups'), value: '' },
			];

			// Add user groups first
			userGroups.forEach((group) => {
				options.push({
					label: `${group.name} (${__('Group', 'wp-authors-and-groups')})`,
					value: `group-${group.id}`,
				});
			});

			// Add individual users
			users.forEach((user) => {
				options.push({
					label: user.name,
					value: `user-${user.id}`,
				});
			});

			return options;
		}, [users, userGroups]);

		// Get current filter value
		const currentFilter = queryContext.wpAuthorsAndGroupsFilter || '';

		// Handle filter change
		const handleFilterChange = (value) => {
			const newQuery = {
				...queryContext,
				wpAuthorsAndGroupsFilter: value || undefined,
			};

			// Remove the property if empty to keep attributes clean
			if (!value) {
				delete newQuery.wpAuthorsAndGroupsFilter;
			}

			setAttributes({
				query: newQuery,
			});
		};

		return (
			<>
				<BlockEdit {...props} />
				<InspectorControls>
					<PanelBody
						title={__('Authors and Groups Filter', 'wp-authors-and-groups')}
						initialOpen={false}
					>
						{isLoading ? (
							<p>{__('Loading...', 'wp-authors-and-groups')}</p>
						) : (
							<SelectControl
								label={__('Filter by Author or Group', 'wp-authors-and-groups')}
								value={currentFilter}
								options={filterOptions}
								onChange={handleFilterChange}
								help={__(
									'Filter posts by specific authors or user groups assigned via the Authors and Groups plugin.',
									'wp-authors-and-groups'
								)}
							/>
						)}
					</PanelBody>
				</InspectorControls>
			</>
		);
	};
};

// Register the filter
addFilter(
	'editor.BlockEdit',
	'wp-authors-and-groups/query-loop-filter',
	withAuthorFilter
);
