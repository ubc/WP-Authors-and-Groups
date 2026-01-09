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

add_action( 'enqueue_block_editor_assets', __NAMESPACE__ . '\\enqueue_scripts', 99 );
add_action( 'init', __NAMESPACE__ . '\\register_meta_fields' );
add_action( 'rest_api_init', __NAMESPACE__ . '\\register_rest_routes' );
add_action( 'admin_init', __NAMESPACE__ . '\\ensure_current_user_on_site' );
add_filter( 'the_author', __NAMESPACE__ . '\\filter_author_display', 10, 1 );

/**
 * Enqueues the necessary scripts and styles for the editor.
 *
 * @return void
 */
function enqueue_scripts() {
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
 * Registers custom meta fields for posts and pages.
 *
 * @return void
 */
function register_meta_fields() {
	$post_types = array( 'post', 'page' );

	foreach ( $post_types as $post_type ) {
		register_post_meta(
			$post_type,
			'wp_authors_and_groups_selected_users',
			array(
				'show_in_rest'      => array(
					'schema' => array(
						'type'  => 'array',
						'items' => array(
							'type' => 'integer',
						),
					),
				),
				'single'            => true,
				'type'              => 'array',
				'default'           => array(),
				'sanitize_callback' => function ( $value ) {
					if ( ! is_array( $value ) ) {
						return array();
					}
					return array_map( 'absint', $value );
				},
				'auth_callback'     => function () {
					return current_user_can( 'edit_posts' );
				},
			)
		);

		register_post_meta(
			$post_type,
			'wp_authors_and_groups_selected_groups',
			array(
				'show_in_rest'      => array(
					'schema' => array(
						'type'  => 'array',
						'items' => array(
							'type' => 'integer',
						),
					),
				),
				'single'            => true,
				'type'              => 'array',
				'default'           => array(),
				'sanitize_callback' => function ( $value ) {
					if ( ! is_array( $value ) ) {
						return array();
					}
					return array_map( 'absint', $value );
				},
				'auth_callback'     => function () {
					return current_user_can( 'edit_posts' );
				},
			)
		);

		register_post_meta(
			$post_type,
			'wp_authors_and_groups_selected_order',
			array(
				'show_in_rest'      => array(
					'schema' => array(
						'type'  => 'array',
						'items' => array(
							'type' => 'string',
						),
					),
				),
				'single'            => true,
				'type'              => 'array',
				'default'           => array(),
				'sanitize_callback' => function ( $value ) {
					if ( ! is_array( $value ) ) {
						return array();
					}
					return array_map( 'sanitize_text_field', $value );
				},
				'auth_callback'     => function () {
					return current_user_can( 'edit_posts' );
				},
			)
		);
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

	register_rest_route(
		'wp-authors-and-groups/v1',
		'/current-user-groups',
		array(
			'methods'             => 'GET',
			'callback'            => __NAMESPACE__ . '\\get_current_user_groups',
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

	// Ensure we have an array (get_terms can return WP_Error or array).
	if ( ! is_array( $terms ) ) {
		return rest_ensure_response( array() );
	}

	// Format terms for REST API response.
	$groups = array_map(
		function ( $term ) {
			return array(
				'id'   => isset( $term->term_id ) ? (int) $term->term_id : 0,
				'name' => isset( $term->name ) ? sanitize_text_field( $term->name ) : '',
				'slug' => isset( $term->slug ) ? sanitize_text_field( $term->slug ) : '',
			);
		},
		$terms
	);

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
 * Gets groups for the current user.
 *
 * @return WP_REST_Response|WP_Error
 */
function get_current_user_groups() {
	// Check if wp-user-groups plugin is active.
	if ( ! taxonomy_exists( 'user-group' ) ) {
		return new \WP_Error(
			'user_groups_not_found',
			__( 'User groups taxonomy not found. Please ensure WP User Groups plugin is active.', 'wp-authors-and-groups' ),
			array( 'status' => 404 )
		);
	}

	// Get current user ID.
	$user_id = get_current_user_id();

	if ( ! $user_id ) {
		return rest_ensure_response( array() );
	}

	// Check if wp_get_terms_for_user function exists (from wp-user-groups plugin).
	if ( ! function_exists( 'wp_get_terms_for_user' ) ) {
		return rest_ensure_response( array() );
	}

	// Get terms for the current user.
	$terms = wp_get_terms_for_user( $user_id, 'user-group' );

	if ( is_wp_error( $terms ) || ! is_array( $terms ) || empty( $terms ) ) {
		return rest_ensure_response( array() );
	}

	// Format terms for REST API response.
	$groups = array_map(
		function ( $term ) {
			return array(
				'id'   => isset( $term->term_id ) ? (int) $term->term_id : 0,
				'name' => isset( $term->name ) ? sanitize_text_field( $term->name ) : '',
				'slug' => isset( $term->slug ) ? sanitize_text_field( $term->slug ) : '',
			);
		},
		$terms
	);

	return rest_ensure_response( $groups );
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
					$user = get_userdata( $user_id );
					if ( $user ) {
						$names[] = $user->display_name;
					}
				}
			} elseif ( strpos( $prefixed_value, 'group-' ) === 0 ) {
				$group_id = absint( str_replace( 'group-', '', $prefixed_value ) );
				if ( $group_id && in_array( $group_id, $selected_groups, true ) ) {
					$term = get_term( $group_id, 'user-group' );
					if ( $term && ! is_wp_error( $term ) ) {
						$names[] = $term->name;
					}
				}
			}
		}
	} else {
		// Fallback: groups first, then users.
		foreach ( $selected_groups as $group_id ) {
			$group_id = absint( $group_id );
			$term     = get_term( $group_id, 'user-group' );
			if ( $term && ! is_wp_error( $term ) ) {
				$names[] = $term->name;
			}
		}

		foreach ( $selected_users as $user_id ) {
			$user_id = absint( $user_id );
			$user    = get_userdata( $user_id );
			if ( $user ) {
				$names[] = $user->display_name;
			}
		}
	}

	// Return comma-separated list with "and" before the last item.
	if ( empty( $names ) ) {
		return '';
	}

	if ( count( $names ) === 1 ) {
		return $names[0];
	}

	if ( count( $names ) === 2 ) {
		return $names[0] . ' and ' . $names[1];
	}

	// For 3+ items: "Item1, Item2, Item3 and Item4".
	$last_item = array_pop( $names );
	return implode( ', ', $names ) . ' and ' . $last_item;
}

/**
 * Filters the author display name.
 *
 * @param string $display_name The author's display name.
 * @return string Modified author display name.
 */
function filter_author_display( $display_name ) {
	global $post;

	if ( ! $post || ! isset( $post->ID ) ) {
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
