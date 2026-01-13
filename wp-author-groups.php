<?php
/**
 * Plugin Name:       WP Authors and Groups
 * Description:       Allow post/page authors to be assigned to user groups.
 * Requires at least: 6.5
 * Requires PHP:      8.2
 * Version:           1.0.0
 * Author:            Kelvin Xu
 * License:           GPL-2.0-or-later
 * License URI:       https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain:       wp-authors-and-groups
 *
 * @package           wp-authors-and-groups
 */

namespace UBC\CTLT\Block\AuthorGroups;

// If this file is called directly, abort.
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

// Define supported post types. Default to 'post' only.
if ( ! defined( 'WP_AUTHORS_AND_GROUPS_POST_TYPES' ) ) {
	define( 'WP_AUTHORS_AND_GROUPS_POST_TYPES', array( 'post', 'page' ) );
}

// Load helper functions.
require_once plugin_dir_path( __FILE__ ) . 'includes/helper.php';

add_action( 'enqueue_block_editor_assets', __NAMESPACE__ . '\\enqueue_post_editor_setting_scripts', 99 );
add_action( 'enqueue_block_editor_assets', __NAMESPACE__ . '\\enqueue_query_loop_filter_script', 99 );
add_action( 'init', __NAMESPACE__ . '\\register_meta_fields' );
add_action( 'rest_api_init', __NAMESPACE__ . '\\register_rest_routes' );
add_action( 'rest_api_init', __NAMESPACE__ . '\\register_rest_query_filters' );
add_filter( 'rest_query_vars', __NAMESPACE__ . '\\add_rest_query_vars' );
add_action( 'admin_init', __NAMESPACE__ . '\\ensure_current_user_on_site' );
add_filter( 'register_taxonomy_args', __NAMESPACE__ . '\\modify_user_group_taxonomy_args', 10, 2 );
add_filter( 'the_author', __NAMESPACE__ . '\\filter_author_display', 10, 1 );
add_filter( 'get_the_author_display_name', __NAMESPACE__ . '\\filter_author_display', 10, 2 );

// Filter the author posts link.
add_filter( 'author_link', __NAMESPACE__ . '\\filter_author_link', 10, 1 );

// Modify author archive query to include posts assigned via meta.
add_action( 'pre_get_posts', __NAMESPACE__ . '\\modify_author_archive_query' );

// Modify user group archive query to include posts assigned via meta.
add_action( 'pre_get_posts', __NAMESPACE__ . '\\modify_user_group_archive_query' );

// Filter Query Loop block query to support author/group filtering in both frontend and block editor.
add_filter( 'query_loop_block_query_vars', __NAMESPACE__ . '\\modify_query_loop_block_query', 10, 3 );

/**
 * Enqueues the necessary scripts and styles for the Block Editor.
 *
 * Loads the editor JavaScript and CSS files that power the author/group selection
 * interface in the post settings panel. Only loads for supported post types.
 *
 * @return void
 */
function enqueue_post_editor_setting_scripts() {
	// Only enqueue for supported post types.
	$screen = get_current_screen();
	if ( ! $screen || ! is_post_type_supported( $screen->post_type ) ) {
		return;
	}

	$plugin_dir_path = plugin_dir_path( __FILE__ );
	$plugin_dir_url  = plugin_dir_url( __FILE__ );

	// Enqueue editor script.
	$editor_js_path = $plugin_dir_path . 'build/post-editor-settings.js';
	$editor_js_url  = $plugin_dir_url . 'build/post-editor-settings.js';
	if ( file_exists( $editor_js_path ) ) {
		wp_enqueue_script(
			'wp-authors-and-groups-script',
			$editor_js_url,
			array(
				'wp-plugins',
				'wp-edit-post',
				'wp-data',
				'wp-element',
				'wp-i18n',
				'wp-api-fetch',
			),
			filemtime( $editor_js_path ),
			true
		);

		// Pass supported post types to JavaScript for conditional rendering.
		wp_localize_script(
			'wp-authors-and-groups-script',
			'wpAuthorsAndGroups',
			array(
				'supportedPostTypes' => get_supported_post_types(),
			)
		);
	}

	// Enqueue editor styles.
	$editor_css_path = $plugin_dir_path . 'build/editor.css';
	$editor_css_url  = $plugin_dir_url . 'build/editor.css';
	if ( file_exists( $editor_css_path ) ) {
		wp_enqueue_style(
			'wp-authors-and-groups-style',
			$editor_css_url,
			array(),
			filemtime( $editor_css_path )
		);
	}

	// Enqueue additional editor styles.
	$additional_css_path = $plugin_dir_path . 'css/editor.css';
	$additional_css_url  = $plugin_dir_url . 'css/editor.css';
	if ( file_exists( $additional_css_path ) ) {
		wp_enqueue_style(
			'wp-authors-and-groups-editor-style',
			$additional_css_url,
			array(),
			filemtime( $additional_css_path )
		);
	}
}

/**
 * Modifies the user-group taxonomy arguments to enable single/archive pages.
 *
 * @param array  $args     Array of arguments for registering a taxonomy.
 * @param string $taxonomy Taxonomy slug.
 * @return array Modified taxonomy arguments.
 */
function modify_user_group_taxonomy_args( $args, $taxonomy ) {
	// Only modify the user-group taxonomy.
	if ( 'user-group' !== $taxonomy ) {
		return $args;
	}

	// Enable public and archive pages.
	$args['public']             = true;
	$args['publicly_queryable'] = true;
	$args['show_in_nav_menus']  = true;
	$args['query_var']          = true;

	// Ensure rewrite rules are set up properly.
	if ( ! isset( $args['rewrite'] ) || ! is_array( $args['rewrite'] ) ) {
		$args['rewrite'] = array();
	}

	// Set URL structure: /users/group/group-name/.
	$args['rewrite']['slug']         = 'users/group';
	$args['rewrite']['with_front']   = false;
	$args['rewrite']['hierarchical'] = true;

	return $args;
}

/**
 * Registers custom meta fields for supported post types.
 *
 * Registers three meta fields for each supported post type:
 * - wp_authors_and_groups_selected_users: Array of user IDs assigned to the post
 * - wp_authors_and_groups_selected_groups: Array of group term IDs assigned to the post
 * - wp_authors_and_groups_selected_order: Array preserving the display order of users/groups
 *
 * These fields are registered with REST API support for use in the Block Editor.
 *
 * @return void
 */
function register_meta_fields() {
	// Get supported post types (configurable via WP_AUTHORS_AND_GROUPS_POST_TYPES constant).
	$post_types = get_supported_post_types();

	// Define meta fields and their configuration types.
	$meta_fields = array(
		'wp_authors_and_groups_selected_users'  => 'users',
		'wp_authors_and_groups_selected_groups' => 'groups',
		'wp_authors_and_groups_selected_order'  => 'order',
	);

	// Register each meta field for each supported post type.
	foreach ( $post_types as $post_type ) {
		foreach ( $meta_fields as $meta_key => $field_type ) {
			register_post_meta(
				$post_type,
				$meta_key,
				get_meta_field_config( $field_type )
			);
		}
	}
}

/**
 * Registers REST API routes for fetching user groups.
 *
 * Creates a REST endpoint at /wp-json/wp-authors-and-groups/v1/user-groups
 * that returns all available user groups for use in the Block Editor interface.
 *
 * @return void
 */
function register_rest_routes() {
	register_rest_route(
		'wp-authors-and-groups/v1',
		'/user-groups',
		array(
			'methods'             => 'GET',
			'callback'            => __NAMESPACE__ . '\\get_user_groups',
			'permission_callback' => function () {
				return current_user_can( 'edit_posts' );
			},
		)
	);
}

/**
 * Registers REST API query filters for all supported post types.
 *
 * WordPress uses different REST query filters for each post type:
 * - rest_post_query for posts
 * - rest_page_query for pages
 * - rest_{$post_type}_query for custom post types
 *
 * This function dynamically registers the filter for all supported post types.
 *
 * @return void
 */
function register_rest_query_filters() {
	$post_types = get_supported_post_types();

	foreach ( $post_types as $post_type ) {
		$filter_name = "rest_{$post_type}_query";
		add_filter( $filter_name, __NAMESPACE__ . '\\modify_rest_query_for_editor', 10, 2 );
	}
}

/**
 * Adds custom query vars to REST API.
 *
 * Registers wpAuthorsAndGroupsFilter as a valid REST API query parameter
 * so it can be passed through Query Loop block requests.
 *
 * @param array $vars Array of allowed query vars.
 * @return array Modified array of query vars.
 */
function add_rest_query_vars( $vars ) {
	$vars[] = 'wpAuthorsAndGroupsFilter';
	return $vars;
}

/**
 * Gets user groups from the wp-user-groups plugin via REST API.
 *
 * Retrieves all user groups from the 'user-group' taxonomy and formats them
 * for use in the Block Editor. Requires the WP User Groups plugin to be active.
 *
 * @return WP_REST_Response|WP_Error REST API response with group data, or error if taxonomy not found.
 */
function get_user_groups() {
	// Check if wp-user-groups plugin is active and taxonomy exists.
	if ( ! taxonomy_exists( 'user-group' ) ) {
		return new \WP_Error(
			'user_groups_not_found',
			__( 'User groups taxonomy not found. Please ensure WP User Groups plugin is active.', 'wp-authors-and-groups' ),
			array( 'status' => 404 )
		);
	}

	// Get all terms from user-group taxonomy, ordered alphabetically.
	$terms = get_terms(
		array(
			'taxonomy'   => 'user-group',
			'hide_empty' => false,
			'orderby'    => 'name',
			'order'      => 'ASC',
		)
	);

	if ( is_wp_error( $terms ) ) {
		return $terms;
	}

	// Format terms for REST API response (id, name, slug).
	$groups = format_terms_for_api( $terms );
	return rest_ensure_response( $groups );
}

/**
 * Ensures the current user is added to the site (for multisite).
 * Runs on admin_init to check and add user before any admin operations.
 *
 * @return void
 */
function ensure_current_user_on_site() {
	// Only run for multisite.
	if ( ! is_multisite() ) {
		return;
	}

	// Get current user ID.
	$user_id = get_current_user_id();

	if ( ! $user_id ) {
		return;
	}

	$blog_id = get_current_blog_id();
	$user    = get_userdata( $user_id );

	// Check if user exists and is not a member of the current site.
	if ( $user && ! is_user_member_of_blog( $user_id, $blog_id ) ) {
		// Add user to the site with subscriber role (minimum role needed).
		add_user_to_blog( $blog_id, $user_id, 'subscriber' );
	}
}

/**
 * Gets formatted author and group names for a post.
 *
 * Retrieves the assigned users and groups for a post and formats them as a
 * readable string (e.g., "John Doe and Jane Smith" or "Group A, Group B and John Doe").
 * Respects the stored order if available, otherwise displays groups first, then users.
 *
 * @param int $post_id Post ID.
 * @return string Comma-separated list of author and group names, or empty string if none assigned.
 */
function get_formatted_authors_and_groups( $post_id ) {
	$post_id = absint( $post_id );

	if ( ! $post_id ) {
		return '';
	}

	// Check if post type is supported.
	$post_type = get_post_type( $post_id );
	if ( ! $post_type || ! is_post_type_supported( $post_type ) ) {
		return '';
	}

	// Get meta values.
	$selected_users  = get_post_meta( $post_id, 'wp_authors_and_groups_selected_users', true );
	$selected_groups = get_post_meta( $post_id, 'wp_authors_and_groups_selected_groups', true );
	$selected_order  = get_post_meta( $post_id, 'wp_authors_and_groups_selected_order', true );

	// Ensure arrays.
	$selected_users  = is_array( $selected_users ) ? $selected_users : array();
	$selected_groups = is_array( $selected_groups ) ? $selected_groups : array();
	$selected_order  = is_array( $selected_order ) ? $selected_order : array();

	// If no selections, return empty string.
	if ( empty( $selected_users ) && empty( $selected_groups ) ) {
		return '';
	}

	$names = array();

	// If we have stored order, use it to maintain the order.
	if ( ! empty( $selected_order ) ) {
		foreach ( $selected_order as $prefixed_value ) {
			if ( strpos( $prefixed_value, 'user-' ) === 0 ) {
				$user_id = absint( str_replace( 'user-', '', $prefixed_value ) );
				if ( $user_id && in_array( $user_id, $selected_users, true ) ) {
					$name = get_user_display_name( $user_id );
					if ( $name ) {
						$names[] = $name;
					}
				}
			} elseif ( strpos( $prefixed_value, 'group-' ) === 0 ) {
				$group_id = absint( str_replace( 'group-', '', $prefixed_value ) );
				if ( $group_id && in_array( $group_id, $selected_groups, true ) ) {
					$name = get_group_name( $group_id );
					if ( $name ) {
						$names[] = $name;
					}
				}
			}
		}
	} else {
		// Fallback: groups first, then users.
		foreach ( $selected_groups as $group_id ) {
			$name = get_group_name( $group_id );
			if ( $name ) {
				$names[] = $name;
			}
		}

		foreach ( $selected_users as $user_id ) {
			$name = get_user_display_name( $user_id );
			if ( $name ) {
				$names[] = $name;
			}
		}
	}

	return format_names_list( $names );
}

/**
 * Filters the author display name to show assigned users/groups.
 *
 * Replaces the default author name with the formatted list of assigned users
 * and groups. On author archive pages, only modifies names within the post loop,
 * preserving the archive page header author name.
 *
 * @param string $display_name The author's display name.
 * @return string Modified author display name, or original if no custom assignment.
 */
function filter_author_display( $display_name ) {
	global $post;

	// If no post, don't modify (e.g., author archive page header).
	if ( ! $post || ! isset( $post->ID ) ) {
		return $display_name;
	}

	// Check if post type is supported.
	if ( ! is_post_type_supported( $post->post_type ) ) {
		return $display_name;
	}

	// On author archive pages, only apply if we're in the loop (displaying posts).
	// Skip if we're displaying the archive page's author name (page header, not in loop).
	if ( is_author() && ! in_the_loop() ) {
		return $display_name;
	}

	$formatted = get_formatted_authors_and_groups( $post->ID );

	// If we have custom authors/groups, return them.
	if ( ! empty( $formatted ) ) {
		return $formatted;
	}

	// Fallback: return the original post author.
	// $display_name already contains the post author's display name,
	// but we'll get it explicitly from the post to be sure.
	$post_author_id = isset( $post->post_author ) ? absint( $post->post_author ) : 0;
	if ( $post_author_id ) {
		$author = get_userdata( $post_author_id );
		if ( $author ) {
			return $author->display_name;
		}
	}

	// Final fallback to the original display name.
	return $display_name;
}

/**
 * Filters the author posts link to use the first assigned user or group.
 *
 * Modifies author links to point to the archive page of the first assigned user
 * or group (based on stored order). If a user is first, links to their author archive.
 * If a group is first, links to the group's term archive page.
 *
 * @param string $link The original author posts link.
 * @return string Modified author posts link, or original if no assignment.
 */
function filter_author_link( $link ) {
	static $filtering = false;

	// Prevent infinite recursion when get_author_posts_url() triggers this filter.
	if ( $filtering ) {
		return $link;
	}

	$filtering = true;

	$post_id = get_the_ID();
	if ( ! $post_id ) {
		$filtering = false;
		return $link;
	}

	// Check if post type is supported.
	$post_type = get_post_type( $post_id );
	if ( ! $post_type || ! is_post_type_supported( $post_type ) ) {
		$filtering = false;
		return $link;
	}

	$selected_users  = get_post_meta( $post_id, 'wp_authors_and_groups_selected_users', true );
	$selected_groups = get_post_meta( $post_id, 'wp_authors_and_groups_selected_groups', true );
	$selected_order  = get_post_meta( $post_id, 'wp_authors_and_groups_selected_order', true );

	// Ensure arrays.
	$selected_users  = is_array( $selected_users ) ? $selected_users : array();
	$selected_groups = is_array( $selected_groups ) ? $selected_groups : array();
	$selected_order  = is_array( $selected_order ) ? $selected_order : array();

	$result = $link;

	// If we have stored order, use it to get the first item (respects user/group order).
	if ( ! empty( $selected_order ) ) {
		$first_item = $selected_order[0];
		if ( strpos( $first_item, 'user-' ) === 0 ) {
			// First item is a user - return user's author archive link.
			$user_id = absint( str_replace( 'user-', '', $first_item ) );
			if ( $user_id && in_array( $user_id, $selected_users, true ) ) {
				remove_filter( 'author_link', __NAMESPACE__ . '\\filter_author_link', 10 );
				$result = get_author_posts_url( $user_id );
				add_filter( 'author_link', __NAMESPACE__ . '\\filter_author_link', 10, 1 );
				$filtering = false;
				return $result;
			}
		} elseif ( strpos( $first_item, 'group-' ) === 0 ) {
			// First item is a group - return group's term archive link.
			$group_id = absint( str_replace( 'group-', '', $first_item ) );
			if ( $group_id && in_array( $group_id, $selected_groups, true ) ) {
				$term_link = get_term_link( $group_id, 'user-group' );
				if ( ! is_wp_error( $term_link ) ) {
					$result    = $term_link;
					$filtering = false;
					return $result;
				}
			}
		}
	}

	// Fallback: if no order stored, use groups first, then users (matching get_formatted_authors_and_groups).
	if ( $result === $link && ! empty( $selected_groups ) ) {
		$term_link = get_term_link( $selected_groups[0], 'user-group' );
		if ( ! is_wp_error( $term_link ) ) {
			$result = $term_link;
			$filtering = false;
			return $result;
		}
	}

	if ( $result === $link && ! empty( $selected_users ) ) {
		remove_filter( 'author_link', __NAMESPACE__ . '\\filter_author_link', 10 );
		$result = get_author_posts_url( $selected_users[0] );
		add_filter( 'author_link', __NAMESPACE__ . '\\filter_author_link', 10, 1 );
	}

	$filtering = false;

	return $result;
}

/**
 * Modifies the author archive query to show only posts assigned via metadata.
 *
 * Filters author archive pages to display only posts where the author is explicitly
 * assigned via the wp_authors_and_groups_selected_users meta field. Posts where
 * the author is only the original post author (without meta assignment) are excluded.
 *
 * Handles both serialized array and plain integer meta value formats.
 *
 * @param WP_Query $query The WP_Query instance.
 * @return void
 */
function modify_author_archive_query( $query ) {
	// Only modify main query on author archive pages.
	if ( ! $query->is_main_query() || ! $query->is_author() ) {
		return;
	}

	// Get the author ID.
	$author_id = $query->get( 'author' );
	if ( ! $author_id ) {
		$author_id = get_queried_object_id();
	}

	if ( ! $author_id ) {
		return;
	}

	// Get post type and ensure it's supported.
	$post_type = $query->get( 'post_type' );
	if ( empty( $post_type ) ) {
		$post_type = 'post';
	}
	// Only process supported post types.
	if ( ! is_post_type_supported( $post_type ) ) {
		return;
	}

	global $wpdb;

	// Get post IDs where author is in selected_users meta.
	// Query directly to handle both serialized arrays and multiple meta entries.
	// Serialized array format: a:2:{i:0;i:1;i:1;i:200;}
	// We need to match the value part: ;i:1; (semicolon before ensures it's a value, not an index).
	$user_meta_posts = $wpdb->get_col(
		$wpdb->prepare(
			"SELECT DISTINCT pm.post_id 
			FROM {$wpdb->postmeta} pm
			INNER JOIN {$wpdb->posts} p ON pm.post_id = p.ID
			WHERE pm.meta_key = %s 
			AND p.post_type = %s
			AND p.post_status = 'publish'
			AND (
				pm.meta_value = %d 
				OR pm.meta_value = %s
				OR pm.meta_value LIKE %s
			)",
			'wp_authors_and_groups_selected_users',
			$post_type,
			$author_id,
			(string) $author_id,
			'%;i:' . $author_id . ';%'
		)
	);

	// Only include posts where the author is directly assigned via selected_users meta.
	$all_post_ids = array_map( 'absint', $user_meta_posts );
	$all_post_ids = array_unique( $all_post_ids );

	// Verify posts exist and are published before including them.
	$valid_post_ids = array();
	foreach ( $all_post_ids as $post_id ) {
		$post = get_post( $post_id );
		if ( $post && 'publish' === $post->post_status && is_post_type_supported( $post->post_type ) ) {
			$valid_post_ids[] = $post_id;
		}
	}

	if ( ! empty( $valid_post_ids ) ) {
		// Use post__in to show only these posts.
		$query->set( 'post__in', $valid_post_ids );
		$query->set( 'orderby', 'post__in' );
		// Remove all author-related query vars since we're using post__in.
		$query->set( 'author', '' );
		$query->set( 'author_name', '' );
		$query->set( 'author__in', array() );
		$query->set( 'author__not_in', array() );
		// Unset author query vars directly.
		unset( $query->query_vars['author'] );
		unset( $query->query_vars['author_name'] );
		// Ensure we're not filtering by post_status since we've already verified them.
		$query->set( 'post_status', 'publish' );
		// Ensure no limit is set that might exclude posts.
		$query->set( 'posts_per_page', -1 );
	} else {
		// If no posts found, set to return nothing.
		$query->set( 'post__in', array( 0 ) );
	}
}

/**
 * Modifies the user group archive query to show only posts assigned via metadata.
 *
 * Filters user group archive pages to display only posts where the group is explicitly
 * assigned via the wp_authors_and_groups_selected_groups meta field. This ensures
 * group archive pages only show posts that have been explicitly assigned to that group.
 *
 * Handles both serialized array and plain integer meta value formats.
 *
 * @param WP_Query $query The WP_Query instance.
 * @return void
 */
function modify_user_group_archive_query( $query ) {
	// Only modify main query on user-group taxonomy archive pages.
	if ( ! $query->is_main_query() ) {
		return;
	}

	// Check if this is a user-group taxonomy archive.
	$queried_object = get_queried_object();
	if ( ! $queried_object || ! isset( $queried_object->taxonomy ) || 'user-group' !== $queried_object->taxonomy ) {
		return;
	}

	// Get the term ID.
	$term_id = $query->get_queried_object_id();
	if ( ! $term_id ) {
		$term = get_queried_object();
		if ( $term && isset( $term->term_id ) ) {
			$term_id = $term->term_id;
		}
	}

	if ( ! $term_id ) {
		return;
	}

	// Get post type and ensure it's supported.
	$post_type = $query->get( 'post_type' );
	if ( empty( $post_type ) ) {
		$post_type = 'post';
	}
	// Only process supported post types.
	if ( ! is_post_type_supported( $post_type ) ) {
		return;
	}

	global $wpdb;

	// Get post IDs where group is in selected_groups meta.
	// Query directly to handle both serialized arrays and multiple meta entries.
	// Serialized array format: a:2:{i:0;i:1;i:1;i:200;}
	// We need to match the value part: ;i:1; (semicolon before ensures it's a value, not an index).
	$group_meta_posts = $wpdb->get_col(
		$wpdb->prepare(
			"SELECT DISTINCT pm.post_id 
			FROM {$wpdb->postmeta} pm
			INNER JOIN {$wpdb->posts} p ON pm.post_id = p.ID
			WHERE pm.meta_key = %s 
			AND p.post_type = %s
			AND p.post_status = 'publish'
			AND (
				pm.meta_value = %d 
				OR pm.meta_value = %s
				OR pm.meta_value LIKE %s
			)",
			'wp_authors_and_groups_selected_groups',
			$post_type,
			$term_id,
			(string) $term_id,
			'%;i:' . $term_id . ';%'
		)
	);

	// Only include posts where the group is directly assigned via selected_groups meta.
	$all_post_ids = array_map( 'absint', $group_meta_posts );
	$all_post_ids = array_unique( $all_post_ids );

	if ( ! empty( $all_post_ids ) ) {
		// Use post__in to show only these posts.
		$query->set( 'post__in', $all_post_ids );
		$query->set( 'orderby', 'post__in' );
		// Remove taxonomy query since we're using post__in.
		$query->set( 'tax_query', array() );
		// Clear the term query to prevent taxonomy filtering.
		$query->set( 'term', '' );
		$query->set( 'taxonomy', '' );
		// Unset the user-group query var that WordPress sets for taxonomy archives.
		unset( $query->query_vars['user-group'] );
		// Ensure post_type is set.
		$query->set( 'post_type', $post_type );
	} else {
		// If no posts found, set to return nothing.
		$query->set( 'post__in', array( 0 ) );
	}
}

/**
 * Enqueues the Query Loop filter extension script.
 *
 * Loads the JavaScript file that extends the Query Loop block with
 * an author/group filter control.
 *
 * @return void
 */
function enqueue_query_loop_filter_script() {
	$plugin_dir_path = plugin_dir_path( __FILE__ );
	$plugin_dir_url  = plugin_dir_url( __FILE__ );

	// Enqueue Query Loop filter script.
	$filter_js_path = $plugin_dir_path . 'build/query-loop-filter.js';
	$filter_js_url  = $plugin_dir_url . 'build/query-loop-filter.js';
	if ( file_exists( $filter_js_path ) ) {
		wp_enqueue_script(
			'wp-authors-and-groups-query-loop-filter',
			$filter_js_url,
			array(
				'wp-hooks',
				'wp-components',
				'wp-block-editor',
				'wp-data',
				'wp-element',
				'wp-i18n',
				'wp-api-fetch',
			),
			filemtime( $filter_js_path ),
			true
		);
	}
}

/**
 * Modifies the Query Loop block query to filter by author or group.
 *
 * Filters the query arguments for Query Loop blocks to include posts
 * that have been assigned to specific authors or user groups via the
 * wp-author-groups plugin meta fields.
 *
 * @param array    $query_args Array of query arguments.
 * @param WP_Block $block      The block instance.
 * @param int      $page       Current page number (unused).
 * @return array Modified query arguments.
 */
function modify_query_loop_block_query( $query_args, $block, $page ) {
	// Unused parameter - kept for filter signature compatibility.
	unset( $page );

	// In WordPress 6.9, block attributes are accessed via $block->attributes.
	$block_attributes = isset( $block->attributes ) ? $block->attributes : array();
	$query_attr = isset( $block_attributes['query'] ) ? $block_attributes['query'] : array();
	$block_context = isset( $block->context ) ? $block->context : array();
	$query_context = isset( $block_context['query'] ) ? $block_context['query'] : array();

	// Try to get filter from attributes first, then context.
	$filter_value = '';
	if ( isset( $query_attr['wpAuthorsAndGroupsFilter'] ) ) {
		$filter_value = $query_attr['wpAuthorsAndGroupsFilter'];
	} elseif ( isset( $query_context['wpAuthorsAndGroupsFilter'] ) ) {
		$filter_value = $query_context['wpAuthorsAndGroupsFilter'];
	}

	// If no filter is set, return original query args.
	if ( empty( $filter_value ) ) {
		return $query_args;
	}

	// Parse the filter value (format: "user-123" or "group-456").
	$is_group = strpos( $filter_value, 'group-' ) === 0;
	$is_user  = strpos( $filter_value, 'user-' ) === 0;

	if ( ! $is_group && ! $is_user ) {
		return $query_args;
	}

	// Get the ID from the filter value.
	$filter_id = absint( str_replace( array( 'group-', 'user-' ), '', $filter_value ) );

	if ( ! $filter_id ) {
		return $query_args;
	}

	// Get post type from query args or default to 'post'.
	$post_type = isset( $query_args['post_type'] ) ? $query_args['post_type'] : 'post';
	if ( is_array( $post_type ) ) {
		$post_type = reset( $post_type );
	}

	// Only process supported post types.
	if ( ! is_post_type_supported( $post_type ) ) {
		return $query_args;
	}

	global $wpdb;

	$post_ids = array();

	if ( $is_user ) {
		// Filter by user: get posts where user is in selected_users meta.
		$user_meta_posts = $wpdb->get_col(
			$wpdb->prepare(
				"SELECT DISTINCT pm.post_id 
				FROM {$wpdb->postmeta} pm
				INNER JOIN {$wpdb->posts} p ON pm.post_id = p.ID
				WHERE pm.meta_key = %s 
				AND p.post_type = %s
				AND p.post_status = 'publish'
				AND (
					pm.meta_value = %d 
					OR pm.meta_value = %s
					OR pm.meta_value LIKE %s
				)",
				'wp_authors_and_groups_selected_users',
				$post_type,
				$filter_id,
				(string) $filter_id,
				'%;i:' . $filter_id . ';%'
			)
		);

		$post_ids = array_map( 'absint', $user_meta_posts );
	} elseif ( $is_group ) {
		// Filter by group: get posts where group is in selected_groups meta.
		$group_meta_posts = $wpdb->get_col(
			$wpdb->prepare(
				"SELECT DISTINCT pm.post_id 
				FROM {$wpdb->postmeta} pm
				INNER JOIN {$wpdb->posts} p ON pm.post_id = p.ID
				WHERE pm.meta_key = %s 
				AND p.post_type = %s
				AND p.post_status = 'publish'
				AND (
					pm.meta_value = %d 
					OR pm.meta_value = %s
					OR pm.meta_value LIKE %s
				)",
				'wp_authors_and_groups_selected_groups',
				$post_type,
				$filter_id,
				(string) $filter_id,
				'%;i:' . $filter_id . ';%'
			)
		);

		$post_ids = array_map( 'absint', $group_meta_posts );
	}

	// Remove duplicates.
	$post_ids = array_unique( $post_ids );

	// If we have post IDs, modify the query to use post__in.
	if ( ! empty( $post_ids ) ) {
		// If there's already a post__in, intersect with our results.
		if ( isset( $query_args['post__in'] ) && ! empty( $query_args['post__in'] ) ) {
			$existing_ids = array_map( 'absint', (array) $query_args['post__in'] );
			$post_ids     = array_intersect( $existing_ids, $post_ids );
		}

		if ( ! empty( $post_ids ) ) {
			$query_args['post__in'] = array_values( $post_ids );
			// Remove author-related query vars since we're filtering by meta.
			unset( $query_args['author'] );
			unset( $query_args['author__in'] );
			unset( $query_args['author__not_in'] );
		} else {
			// No matching posts, return empty result.
			$query_args['post__in'] = array( 0 );
		}
	} else {
		// No posts found, return empty result.
		$query_args['post__in'] = array( 0 );
	}

	return $query_args;
}

/**
 * Modifies REST API queries for Query Loop editor previews.
 *
 * In WordPress 6.9, Query Loop blocks use the REST API for editor previews.
 * This filter handles the wpAuthorsAndGroupsFilter parameter from the request.
 *
 * @param array           $args    Array of arguments for WP_Query.
 * @param WP_REST_Request $request REST API request object.
 * @return array Modified query arguments.
 */
function modify_rest_query_for_editor( $args, $request ) {
	// Check if the filter parameter is in the request.
	$filter_value = $request->get_param( 'wpAuthorsAndGroupsFilter' );

	if ( empty( $filter_value ) ) {
		return $args;
	}

	// Parse the filter value (format: "user-123" or "group-456").
	$is_group = strpos( $filter_value, 'group-' ) === 0;
	$is_user  = strpos( $filter_value, 'user-' ) === 0;

	if ( ! $is_group && ! $is_user ) {
		return $args;
	}

	// Get the ID from the filter value.
	$filter_id = absint( str_replace( array( 'group-', 'user-' ), '', $filter_value ) );

	if ( ! $filter_id ) {
		return $args;
	}

	// Get post type from query args or default to 'post'.
	$post_type = isset( $args['post_type'] ) ? $args['post_type'] : 'post';
	if ( is_array( $post_type ) ) {
		$post_type = reset( $post_type );
	}

	// Only process supported post types.
	if ( ! is_post_type_supported( $post_type ) ) {
		return $args;
	}

	global $wpdb;

	$post_ids = array();

	if ( $is_user ) {
		// Filter by user: get posts where user is in selected_users meta.
		$user_meta_posts = $wpdb->get_col(
			$wpdb->prepare(
				"SELECT DISTINCT pm.post_id 
				FROM {$wpdb->postmeta} pm
				INNER JOIN {$wpdb->posts} p ON pm.post_id = p.ID
				WHERE pm.meta_key = %s 
				AND p.post_type = %s
				AND p.post_status = 'publish'
				AND (
					pm.meta_value = %d 
					OR pm.meta_value = %s
					OR pm.meta_value LIKE %s
				)",
				'wp_authors_and_groups_selected_users',
				$post_type,
				$filter_id,
				(string) $filter_id,
				'%;i:' . $filter_id . ';%'
			)
		);

		$post_ids = array_map( 'absint', $user_meta_posts );
	} elseif ( $is_group ) {
		// Filter by group: get posts where group is in selected_groups meta.
		$group_meta_posts = $wpdb->get_col(
			$wpdb->prepare(
				"SELECT DISTINCT pm.post_id 
				FROM {$wpdb->postmeta} pm
				INNER JOIN {$wpdb->posts} p ON pm.post_id = p.ID
				WHERE pm.meta_key = %s 
				AND p.post_type = %s
				AND p.post_status = 'publish'
				AND (
					pm.meta_value = %d 
					OR pm.meta_value = %s
					OR pm.meta_value LIKE %s
				)",
				'wp_authors_and_groups_selected_groups',
				$post_type,
				$filter_id,
				(string) $filter_id,
				'%;i:' . $filter_id . ';%'
			)
		);

		$post_ids = array_map( 'absint', $group_meta_posts );
	}

	// Remove duplicates.
	$post_ids = array_unique( $post_ids );

	// If we have post IDs, modify the query to use post__in.
	if ( ! empty( $post_ids ) ) {
		// If there's already a post__in, intersect with our results.
		if ( isset( $args['post__in'] ) && ! empty( $args['post__in'] ) ) {
			$existing_ids = array_map( 'absint', (array) $args['post__in'] );
			$post_ids     = array_intersect( $existing_ids, $post_ids );
		}

		if ( ! empty( $post_ids ) ) {
			$args['post__in'] = array_values( $post_ids );
			// Remove author-related query vars since we're filtering by meta.
			unset( $args['author'] );
			unset( $args['author__in'] );
			unset( $args['author__not_in'] );
		} else {
			// No matching posts, return empty result.
			$args['post__in'] = array( 0 );
		}
	} else {
		// No posts found, return empty result.
		$args['post__in'] = array( 0 );
	}

	return $args;
}
