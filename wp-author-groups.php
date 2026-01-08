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

add_action( 'enqueue_block_editor_assets', __NAMESPACE__ . '\\enqueue_scripts', 99 );
add_action( 'init', __NAMESPACE__ . '\\register_meta_fields' );
add_action( 'rest_api_init', __NAMESPACE__ . '\\register_rest_routes' );

	/**
	 * Enqueues the necessary scripts and styles for the editor.
	 *
	 * @return void
	 */
function enqueue_scripts() {
	wp_enqueue_script(
		'wp-authors-and-groups-script',
		plugin_dir_url( __FILE__ ) . '/build/editor.js',
		array(
			'wp-plugins',
			'wp-edit-post',
			'wp-components',
			'wp-data',
			'wp-element',
			'wp-i18n',
			'wp-api-fetch',
		),
		filemtime( plugin_dir_path( __FILE__ ) . '/build/editor.js' ),
		true
	);

	wp_enqueue_style(
		'wp-authors-and-groups-style',
		plugin_dir_url( __FILE__ ) . '/build/editor.css',
		array(),
		filemtime( plugin_dir_path( __FILE__ ) . '/build/editor.css' )
	);

	wp_enqueue_style(
		'wp-authors-and-groups-editor-style',
		plugin_dir_url( __FILE__ ) . '/css/editor.css',
		array(),
		filemtime( plugin_dir_path( __FILE__ ) . '/css/editor.css' )
	);
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

	// Format terms for REST API response.
	$groups = array_map(
		function ( $term ) {
			return array(
				'id'   => $term->term_id,
				'name' => $term->name,
				'slug' => $term->slug,
			);
		},
		$terms
	);

	return rest_ensure_response( $groups );
}
