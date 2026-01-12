<?php
/**
 * Helper functions for WP Authors and Groups plugin.
 *
 * This file contains utility functions used throughout the plugin for
 * post type checking, meta field configuration, data formatting, and
 * user/group name retrieval.
 *
 * @package wp-authors-and-groups
 */

namespace UBC\CTLT\Block\AuthorGroups;

// If this file is called directly, abort.
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Gets the supported post types.
 *
 * @return array Array of supported post type slugs.
 */
function get_supported_post_types() {
	$post_types = WP_AUTHORS_AND_GROUPS_POST_TYPES;
	return is_array( $post_types ) ? $post_types : array( 'post' );
}

/**
 * Checks if a post type is supported.
 *
 * @param string $post_type Post type slug.
 * @return bool True if supported, false otherwise.
 */
function is_post_type_supported( $post_type ) {
	$supported = get_supported_post_types();
	return in_array( $post_type, $supported, true );
}

/**
 * Gets meta field configuration for a given field type.
 *
 * @param string $field_type Field type: 'users', 'groups', or 'order'.
 * @return array Meta field configuration array.
 */
function get_meta_field_config( $field_type ) {
	$configs = array(
		'users'  => array(
			'schema' => array(
				'type'  => 'array',
				'items' => array(
					'type' => 'integer',
				),
			),
			'sanitize' => 'absint',
		),
		'groups' => array(
			'schema' => array(
				'type'  => 'array',
				'items' => array(
					'type' => 'integer',
				),
			),
			'sanitize' => 'absint',
		),
		'order'  => array(
			'schema' => array(
				'type'  => 'array',
				'items' => array(
					'type' => 'string',
				),
			),
			'sanitize' => 'sanitize_text_field',
		),
	);

	if ( ! isset( $configs[ $field_type ] ) ) {
		return array();
	}

	$config = $configs[ $field_type ];
	$sanitize_callback = $config['sanitize'];

	return array(
		'show_in_rest'      => array(
			'schema' => $config['schema'],
		),
		'single'            => true,
		'type'              => 'array',
		'default'           => array(),
		'sanitize_callback' => function ( $value ) use ( $sanitize_callback ) {
			if ( ! is_array( $value ) ) {
				return array();
			}
			return array_map( $sanitize_callback, $value );
		},
		'auth_callback'     => function () {
			return current_user_can( 'edit_posts' );
		},
	);
}

/**
 * Formats term objects for REST API response.
 *
 * @param array $terms Array of term objects.
 * @return array Array of formatted term data.
 */
function format_terms_for_api( $terms ) {
	if ( ! is_array( $terms ) || empty( $terms ) ) {
		return array();
	}

	return array_map(
		function ( $term ) {
			return array(
				'id'   => isset( $term->term_id ) ? (int) $term->term_id : 0,
				'name' => isset( $term->name ) ? sanitize_text_field( $term->name ) : '',
				'slug' => isset( $term->slug ) ? sanitize_text_field( $term->slug ) : '',
			);
		},
		$terms
	);
}

/**
 * Gets user display name by ID.
 *
 * @param int $user_id User ID.
 * @return string User display name or empty string.
 */
function get_user_display_name( $user_id ) {
	$user_id = absint( $user_id );
	if ( ! $user_id ) {
		return '';
	}
	$user = get_userdata( $user_id );
	return $user ? $user->display_name : '';
}

/**
 * Gets group name by ID.
 *
 * @param int $group_id Group term ID.
 * @return string Group name or empty string.
 */
function get_group_name( $group_id ) {
	$group_id = absint( $group_id );
	if ( ! $group_id ) {
		return '';
	}
	$term = get_term( $group_id, 'user-group' );
	return ( $term && ! is_wp_error( $term ) ) ? $term->name : '';
}

/**
 * Formats an array of names into a comma-separated list with "and" before the last item.
 *
 * @param array $names Array of name strings.
 * @return string Formatted string.
 */
function format_names_list( $names ) {
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

