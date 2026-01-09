/**
 * WordPress Authors and Groups Components
 *
 * Reusable components for the authors and groups editor panel.
 *
 * @package wp-authors-and-groups
 */

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const { __ } = wp.i18n;

/**
 * Draggable MultiValue Component for react-select
 *
 * Makes the selected items in react-select draggable.
 *
 * @param {Object} props Component props from react-select.
 * @return {JSX.Element} The draggable multi-value component.
 */
export const DraggableMultiValue = (props) => {
	const {
		attributes,
		listeners,
		setNodeRef,
		transform,
		transition,
		isDragging,
	} = useSortable({ id: props.data.value });

	const containerStyle = {
		transform: CSS.Transform.toString(transform),
		transition,
		opacity: isDragging ? 0.5 : 1,
		// Ensure background is applied with light grey
		backgroundColor: '#f0f0f1',
		color: '#2c3338',
		padding: '6px 10px',
		margin: '2px 4px 2px 0',
		borderRadius: '4px',
		border: '1px solid #dcdcde',
		display: 'flex',
		alignItems: 'center',
		gap: '6px',
		boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
	};

	// Drag handle style - only this area is draggable
	const dragHandleStyle = {
		cursor: isDragging ? 'grabbing' : 'grab',
		display: 'flex',
		alignItems: 'center',
		padding: '0 4px',
		marginRight: '4px',
		color: '#646970',
	};

	// Preserve react-select's default MultiValue structure
	// Apply drag listeners only to a drag handle, not the entire item
	// props.children already contains the label, so we just render it directly
	return (
		<div
			ref={setNodeRef}
			style={containerStyle}
			{...attributes}
		>
			{/* Drag handle - only this area triggers dragging */}
			<span
				{...listeners}
				style={dragHandleStyle}
				aria-label={__('Drag to reorder', 'wp-authors-and-groups')}
			>
				<svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
					<circle cx="2" cy="2" r="1"/>
					<circle cx="6" cy="2" r="1"/>
					<circle cx="10" cy="2" r="1"/>
					<circle cx="2" cy="6" r="1"/>
					<circle cx="6" cy="6" r="1"/>
					<circle cx="10" cy="6" r="1"/>
					<circle cx="2" cy="10" r="1"/>
					<circle cx="6" cy="10" r="1"/>
					<circle cx="10" cy="10" r="1"/>
				</svg>
			</span>
			{/* Label - props.children already contains the rendered label */}
			{props.children}
			{/* Remove button - use removeProps from react-select for proper removal */}
			{props.removeProps && (
				<button
					className="wp-authors-and-groups-select__multi-value__remove"
					{...props.removeProps}
					onMouseDown={(e) => {
						// Prevent drag from starting when clicking remove button
						e.stopPropagation();
					}}
					onClick={(e) => {
						// Prevent any drag handlers from interfering
						e.stopPropagation();
						// Call the original remove handler
						if (props.removeProps.onClick) {
							props.removeProps.onClick(e);
						}
					}}
					aria-label={__('Remove', 'wp-authors-and-groups')}
				>
					×
				</button>
			)}
		</div>
	);
};
