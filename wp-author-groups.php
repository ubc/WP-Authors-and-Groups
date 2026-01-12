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
	define( 'WP_AUTHORS_AND_GROUPS_POST_TYPES', array( 'post' ) );
}

// Load helper functions.
require_once plugin_dir_path( __FILE__ ) . 'includes/helper.php';

add_action( 'enqueue_block_editor_assets', __NAMESPACE__ . '\\enqueue_scripts', 99 );
add_action( 'init', __NAMESPACE__ . '\\register_meta_fields' );
add_action( 'rest_api_init', __NAMESPACE__ . '\\register_rest_routes' );
add_action( 'admin_init', __NAMESPACE__ . '\\ensure_current_user_on_site' );
add_filter( 'register_taxonomy_args', __NAMESPACE__ . '\\modify_user_group_taxonomy_args', 10, 2 );
add_filter( 'the_author', __NAMESPACE__ . '\\filter_author_display', 10, 1 );
add_filter( 'get_the_author_display_name', __NAMESPACE__ . '\\filter_author_display', 10, 2 );

// Filter the author posts link.
add_filter( 'author_link', __NAMESPACE__ . '\\filter_author_link', 10, 1 );

// Modify author archive query to include posts assigned via meta.
add_action( 'pre_get_posts', __NAMESPACE__ . '\\modify_author_archive_query' );

/**
 * Enqueues the necessary scripts and styles for the editor post/page author setting.
 *
 * @return void
 */
function enqueue_scripts() {
	// Only enqueue for supported post types.
	$screen = get_current_screen();
	if ( ! $screen || ! is_post_type_supported( $screen->post_type ) ) {
		return;
	}

	$plugin_dir_path = plugin_dir_path( __FILE__ );
	$plugin_dir_url  = plugin_dir_url( __FILE__ );

	// Enqueue editor script.
	$editor_js_path = $plugin_dir_path . 'build/editor.js';
	$editor_js_url  = $plugin_dir_url . 'build/editor.js';
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

		// Localize script with supported post types.
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

	$args['rewrite']['slug']         = 'users/group';
	$args['rewrite']['with_front']    = false;
	$args['rewrite']['hierarchical'] = true;

	return $args;
}

/**
 * Registers custom meta fields for supported post types.
 *
 * @return void
 */
function register_meta_fields() {
	// Get supported post types.
	$post_types = get_supported_post_types();

	$meta_fields = array(
		'wp_authors_and_groups_selected_users'  => 'users',
		'wp_authors_and_groups_selected_groups' => 'groups',
		'wp_authors_and_groups_selected_order'  => 'order',
	);

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
 * Registers REST API routes for user groups.
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
 * Gets user groups from wp-user-groups plugin.
 *
 * @return WP_REST_Response|WP_Error
 */
function get_user_groups() {
	// Check if wp-user-groups plugin is active.
	if ( ! taxonomy_exists( 'user-group' ) ) {
		return new \WP_Error(
			'user_groups_not_found',
			__( 'User groups taxonomy not found. Please ensure WP User Groups plugin is active.', 'wp-authors-and-groups' ),
			array( 'status' => 404 )
		);
	}

	// Get terms from user-group taxonomy.
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

	// Format and return terms.
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
 * @param int $post_id Post ID.
 * @return string Comma-separated list of author and group names.
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
 * Filters the author display name.
 *
 * @param string $display_name The author's display name.
 * @return string Modified author display name.
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
 * Filters the author posts link to use the link of first user or group assigned to the post.
 *
 * @param string $link The author posts link.
 * @return string Modified author posts link.
 */
function filter_author_link( $link ) {
	static $filtering = false;

	// Prevent infinite recursion.
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
 * Modifies the author archive query to include posts assigned to the author via meta.
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

	if ( ! empty( $all_post_ids ) ) {
		// Use post__in to show only these posts.
		$query->set( 'post__in', $all_post_ids );
		$query->set( 'orderby', 'post__in' );
		// Remove author query since we're using post__in.
		$query->set( 'author', '' );
	} else {
		// If no posts found, set to return nothing.
		$query->set( 'post__in', array( 0 ) );
	}
}
