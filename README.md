# WP Authors and Groups

[![WordPress](https://img.shields.io/badge/WordPress-6.5%2B-blue.svg)](https://wordpress.org/)
[![PHP](https://img.shields.io/badge/PHP-8.2%2B-purple.svg)](https://php.net/)
[![License](https://img.shields.io/badge/License-GPL--2.0%2B-green.svg)](https://www.gnu.org/licenses/gpl-2.0.html)

A WordPress plugin that extends post authorship by allowing posts to be assigned to individual users and user groups, with full support for the Block Editor.

## Table of Contents

- [Description](#description)
- [Key Features](#key-features)
- [Requirements](#requirements)
- [Installation](#installation)
- [Configuration](#configuration)
- [Usage](#usage)
- [Changelog](#changelog)

## Description

WP Authors and Groups enhances WordPress's default author functionality by enabling posts to be assigned to multiple users and user groups. This is particularly useful for multi-author sites, collaborative content, and organizations that need to attribute content to teams or departments.

### Key Features

- **Multiple Author Assignment**: Assign posts to multiple users and/or user groups
- **Custom Author Display**: Display custom author names (formatted as "User A, User B and Group C")
- **Smart Author Links**: Author links automatically point to the first assigned user or group archive
- **Archive Page Filtering**: Author and group archive pages show only posts explicitly assigned via metadata
- **Block Editor Integration**: Full support for the WordPress Block Editor with drag-and-drop reordering
- **Order Preservation**: Maintain custom display order of users and groups
- **Configurable Post Types**: Enable the feature for specific post types via PHP constant

## Requirements

- WordPress 6.5 or higher
- PHP 8.2 or higher
- [WP User Groups](https://wordpress.org/plugins/wp-user-groups/) plugin (for user group functionality)

## Installation

1. Upload the `wp-author-groups` folder to `/wp-content/plugins/`
2. Activate the plugin through the 'Plugins' menu in WordPress
3. Ensure the WP User Groups plugin is installed and activated
4. Configure supported post types (optional, see Configuration)

## Configuration

### Supported Post Types

By default, the plugin only works with the `post` post type. To enable it for additional post types, define the `WP_AUTHORS_AND_GROUPS_POST_TYPES` constant in your wp-config.php file or your theme's functions.php like below:

```php
define( 'WP_AUTHORS_AND_GROUPS_POST_TYPES', array( 'post', 'page', 'custom-post-type' ) );
```

## Usage

### In the Block Editor

1. Open any supported post type in the Block Editor
2. In the post settings panel (right sidebar), find the "Authors and Groups" section
3. Use the dropdown to select users and/or groups
4. Drag and drop items to reorder them (the first item determines the author link)
5. Save or publish the post

### How It Works

- **Author Display**: When a post has assigned users/groups, the author name displayed on the frontend will show the formatted list (e.g., "John Doe, Jane Smith and Marketing Team")
- **Author Links**: Clicking the author name links to the archive page of the first item in the order
- **Archive Pages**: 
  - Author archive pages (`/author/username/`) show only posts where that user is assigned via metadata
  - Group archive pages (`/users/group/group-name/`) show only posts where that group is assigned via metadata

## Changelog

### 1.0.0
- Initial release
- Block Editor integration with drag-and-drop
- Author and group archive page filtering
- Custom author display and link functionality
- Configurable post type support

