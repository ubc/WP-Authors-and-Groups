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

	/**
	 * Enqueues the necessary scripts and styles for the editor.
	 *
	 * @return void
	 */
function enqueue_scripts() {
	wp_enqueue_script(
		'wp-authors-and-groups-script',
		plugin_dir_url( __FILE__ ) . '/build/index.js',
		array(
			'wp-plugins',
			'wp-edit-post',
			'wp-components',
			'wp-data',
			'wp-element',
			'wp-i18n',
		),
		filemtime( plugin_dir_path( __FILE__ ) . '/build/index.js' ),
		true
	);

	wp_enqueue_style(
		'wp-authors-and-groups-style',
		plugin_dir_url( __FILE__ ) . '/build/index.css',
		array(),
		filemtime( plugin_dir_path( __FILE__ ) . '/build/index.css' )
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
			'wp_authors_and_groups_dummy_setting',
			array(
				'show_in_rest'  => true,
				'single'        => true,
				'type'          => 'string',
				'auth_callback' => function () {
					return current_user_can( 'edit_posts' );
				},
			)
		);
	}
}
