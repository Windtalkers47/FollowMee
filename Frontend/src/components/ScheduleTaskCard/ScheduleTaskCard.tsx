// import React, { useState, useRef, useMemo } from 'react';
// import {
//   Box,
//   Typography,
//   Chip,
//   IconButton,
//   Menu,
//   MenuItem,
//   Button,
//   useTheme,
//   useMediaQuery
// } from '@mui/material';
// import {
//   MoreVert as MoreVertIcon,
//   Edit as EditIcon,
//   Delete as DeleteIcon,
//   CheckCircle as CheckCircleIcon,
//   RadioButtonUnchecked as RadioButtonUncheckedIcon,
//   Schedule as ScheduleIcon,
//   Person as PersonIcon,
//   CalendarToday as CalendarIcon,
//   Comment as CommentIcon,
//   Favorite as FavoriteIcon
// } from '@mui/icons-material';
// import { parseISO, isPast, isToday, isTomorrow } from 'date-fns';
// import { Task, TaskLikeSummary } from '../../api/task.api';
// import { getTaskPermissions } from '../../permissions/taskPermissions';

// interface ScheduleTaskCardProps {
//   task: Task;
//   likeSummary?: TaskLikeSummary;
//   currentUserId: number;
//   onEdit: (task: Task) => void;
//   onDelete: (taskId: string) => void;
//   onLike?: (taskId: string, likeType: 'like' | 'love' | 'laugh' | 'angry' | 'wow' | 'sad') => void;
//   onUnlike?: (taskId: string) => void;
//   onComment?: (taskId: string, comment: string) => void;
//   onMarkDone?: (taskId: string) => void;
//   onMarkUndone?: (taskId: string) => void;
//   onUndo?: (taskId: string) => void;
//   onApprove?: (taskId: string) => void;
//   onReject?: (taskId: string) => void;
//   onCancel?: (taskId: string) => void;
//   onStartProgress?: (taskId: string) => void;
//   onUpdateTaskStatus?: (taskId: string, status: Task['status']) => void;
// }

// const getStatusColor = (status: string) => {
//   switch (status) {
//     case 'draft': return '#9e9e9e';
//     case 'todo': return '#2196f3';
//     case 'in_progress': return '#ff9800';
//     case 'review': return '#9c27b0';
//     case 'done': return '#4caf50';
//     case 'cancelled': return '#f44336';
//     default: return '#757575';
//   }
// };

// const getStatusLabel = (status: string) => {
//   switch (status) {
//     case 'draft': return 'Draft';
//     case 'todo': return 'To Do';
//     case 'in_progress': return 'In Progress';
//     case 'review': return 'Review';
//     case 'done': return 'Done';
//     case 'cancelled': return 'Cancelled';
//     default: return status;
//   }
// };

// const getDueDateInfo = (task: Task) => {
//   if (!task.dueDate && !task.endDate) return null;
  
//   const date = task.endDate ? parseISO(task.endDate) : parseISO(task.dueDate!);
//   const now = new Date();
  
//   if (isPast(date) && !isToday(date)) {
//     return { text: `Overdue by ${Math.ceil((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))} days`, color: '#f44336' };
//   } else if (isToday(date)) {
//     return { text: 'Due Today', color: '#ff9800' };
//   } else if (isTomorrow(date)) {
//     return { text: 'Due Tomorrow', color: '#ff9800' };
//   } else {
//     return { text: `Due in ${Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))} days`, color: '#4caf50' };
//   }
// };

// export const ScheduleTaskCard: React.FC<ScheduleTaskCardProps> = ({
//   task,
//   likeSummary,
//   currentUserId,
//   onEdit,
//   onDelete,
//   onLike,
//   onUnlike,
//   onComment,
//   onMarkDone,
//   onMarkUndone,
//   onUndo,
//   onApprove,
//   onReject,
//   onCancel,
//   onStartProgress,
//   onUpdateTaskStatus
// }) => {
//   const theme = useTheme();
//   const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
//   const [isHovered, setIsHovered] = useState(false);
  
//   // Mobile swipe detection
//   const swipeRef = useRef<HTMLDivElement>(null);
//   const [touchStart, setTouchStart] = useState<number | null>(null);
//   const [touchEnd, setTouchEnd] = useState<number | null>(null);
//   const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

//   // Theme-aware colors
//   const isDarkMode = theme.palette.mode === 'dark';
//   const textColor = isDarkMode 
//     ? 'rgba(255, 255, 255, 0.95)' 
//     : 'rgba(0, 0, 0, 0.87)';
//   const secondaryTextColor = isDarkMode 
//     ? 'rgba(255, 255, 255, 0.7)' 
//     : 'rgba(0, 0, 0, 0.6)';
//   const iconColor = isDarkMode 
//     ? 'rgba(255, 255, 255, 0.6)' 
//     : 'rgba(0, 0, 0, 0.6)';

//   const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
//     setAnchorEl(event.currentTarget);
//   };

//   const handleMenuClose = () => {
//     setAnchorEl(null);
//   };

//   const dueDateInfo = getDueDateInfo(task);
//   const totalLikes = likeSummary ? Object.values(likeSummary).reduce((sum, count) => sum + count, 0) : 0;
//   const commentCount = 0; // Default to 0 since commentCount doesn't exist in Task type

//   // Compute permissions for menu item disabling
//   const permissions = useMemo(() => 
//     getTaskPermissions({
//       userId: currentUserId,
//       task,
//     }),
//     [currentUserId, task]
//   );


//   // Swipe handlers
//   const handleTouchStart = (e: React.TouchEvent) => {
//     setTouchEnd(null);
//     setTouchStart(e.targetTouches[0].clientX);
//   };

//   const handleTouchMove = (e: React.TouchEvent) => {
//     setTouchEnd(e.targetTouches[0].clientX);
//   };

//   const handleTouchEnd = () => {
//     if (!touchStart || !touchEnd) return;
    
//     const distance = touchStart - touchEnd;
//     const minSwipeDistance = 80; // Increased threshold for better UX
//     const isLeftSwipe = distance < -minSwipeDistance; // Swipe right (negative distance)
    
//     if (isLeftSwipe && permissions.canStart && onStartProgress) {
//       onStartProgress(task.taskId);
//     }
    
//     setTouchStart(null);
//     setTouchEnd(null);
//   };

//   const getStatusIcon = () => {
//     switch (task.status) {
//       case 'done': return <CheckCircleIcon sx={{ color: '#4caf50', fontSize: 20 }} />;
//       case 'in_progress': return <ScheduleIcon sx={{ color: '#ff9800', fontSize: 20 }} />;
//       default: return <RadioButtonUncheckedIcon sx={{ color: '#9e9e9e', fontSize: 20 }} />;
//     }
//   };

//   return (
//     <Box
//       sx={{
//         p: 3,
//         borderRadius: 4,
//         background: isDarkMode 
//           ? 'rgba(255, 255, 255, 0.12)' 
//           : 'rgba(255, 255, 255, 0.7)',
//         backdropFilter: 'blur(40px) saturate(180%)',
//         WebkitBackdropFilter: 'blur(40px) saturate(180%)',
//         border: `1px solid ${isDarkMode ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.8)'}`,
//         cursor: 'pointer',
//         transition: 'all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
//         position: 'relative',
//         overflow: 'visible',
//         boxShadow: isDarkMode 
//           ? '0 4px 30px rgba(0, 0, 0, 0.3)' 
//           : '0 8px 32px rgba(0, 0, 0, 0.1)',
//         '&:hover': {
//           background: isDarkMode 
//             ? 'rgba(255, 255, 255, 0.18)' 
//             : 'rgba(255, 255, 255, 0.9)',
//           transform: 'translateY(-4px) scale(1.01)',
//           boxShadow: isDarkMode 
//             ? '0 12px 40px rgba(0, 0, 0, 0.4)' 
//             : '0 16px 48px rgba(0, 0, 0, 0.15)',
//           '& .action-buttons': {
//             opacity: 1,
//             transform: 'translateY(0)'
//           }
//         },
//         '&::before': {
//           content: '""',
//           position: 'absolute',
//           top: 0,
//           left: 0,
//           right: 0,
//           height: 3,
//           background: `linear-gradient(90deg, ${getStatusColor(task.status)} 0%, ${getStatusColor(task.status)}88 100%)`,
//           borderRadius: '4px 4px 0 0'
//         }
//       }}
//       onMouseEnter={() => setIsHovered(true)}
//       onMouseLeave={() => setIsHovered(false)}
//     >
//       {/* Header - Title and Menu */}
//       <Box sx={{ 
//         display: 'flex', 
//         alignItems: 'flex-start', 
//         justifyContent: 'space-between', 
//         mb: 1.5
//       }}>
//         {/* Title */}
//         <Typography 
//           variant="h6" 
//           sx={{ 
//             fontSize: '1.25rem',
//             fontWeight: 700,
//             color: textColor,
//             lineHeight: 1.3,
//             display: '-webkit-box',
//             WebkitLineClamp: 2,
//             WebkitBoxOrient: 'vertical',
//             overflow: 'hidden',
//             letterSpacing: '-0.02em',
//             flex: 1,
//             mr: 2
//           }}
//         >
//           {task.title}
//         </Typography>
        
//         {/* Menu Button */}
//         <IconButton
//           size="small"
//           onClick={handleMenuOpen}
//           sx={{
//             color: iconColor,
//             p: 0.75,
//             backdropFilter: 'blur(20px)',
//             background: isDarkMode 
//               ? 'rgba(255, 255, 255, 0.08)' 
//               : 'rgba(0, 0, 0, 0.04)',
//             borderRadius: 2,
//             border: `1px solid ${isDarkMode ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)'}`,
//             transition: 'all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
//             flexShrink: 0,
//             '&:hover': {
//               color: textColor,
//               background: isDarkMode 
//                 ? 'rgba(255, 255, 255, 0.15)' 
//                 : 'rgba(0, 0, 0, 0.08)',
//               transform: 'scale(1.1) rotate(90deg)',
//               boxShadow: isDarkMode 
//                 ? '0 8px 24px rgba(255, 255, 255, 0.15)' 
//                 : '0 8px 24px rgba(0, 0, 0, 0.12)'
//             },
//             '&:active': {
//               transform: 'scale(0.95)'
//             }
//           }}
//         >
//           <MoreVertIcon sx={{ fontSize: 20 }} />
//         </IconButton>
//       </Box>

//       {/* Description */}
//       {task.description && (
//         <Typography 
//           variant="body2" 
//           sx={{ 
//             color: secondaryTextColor,
//             fontSize: '0.9rem',
//             lineHeight: 1.6,
//             display: '-webkit-box',
//             WebkitLineClamp: 3,
//             WebkitBoxOrient: 'vertical',
//             overflow: 'hidden',
//             letterSpacing: '-0.01em',
//             mb: 2
//           }}
//         >
//           {task.description}
//         </Typography>
//       )}

//       {/* Task Details */}
//       <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2, flexWrap: 'wrap' }}>
//         {/* Status Chip */}
//         <Chip
//           label={getStatusLabel(task.status)}
//           size="small"
//           sx={{
//             background: `linear-gradient(135deg, ${getStatusColor(task.status)} 0%, ${getStatusColor(task.status)}dd 100%)`,
//             color: 'white',
//             fontSize: '0.7rem',
//             fontWeight: 700,
//             height: 26,
//             px: 1.25,
//             borderRadius: 1.5,
//             textTransform: 'uppercase',
//             letterSpacing: '0.05em',
//             backdropFilter: 'blur(20px)',
//             boxShadow: `0 2px 8px ${getStatusColor(task.status)}40`,
//             border: '1px solid rgba(255, 255, 255, 0.2)'
//           }}
//         />

//         {/* Assignee */}
//         {task.assignedTo && (
//           <Box sx={{ 
//             display: 'flex', 
//             alignItems: 'center', 
//             gap: 0.5,
//             px: 1.25,
//             py: 0.5,
//             borderRadius: 1.5,
//             background: isDarkMode 
//               ? 'rgba(255, 255, 255, 0.06)' 
//               : 'rgba(0, 0, 0, 0.04)',
//             border: `1px solid ${isDarkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)'}`
//           }}>
//             <PersonIcon sx={{ fontSize: 14, color: iconColor }} />
//             <Typography variant="caption" sx={{ color: secondaryTextColor, fontSize: '0.75rem', fontWeight: 500 }}>
//               {task.assignedToUser?.userName || `User ${task.assignedTo}`}
//             </Typography>
//           </Box>
//         )}

//         {/* Due Date */}
//         {dueDateInfo && (
//           <Box sx={{ 
//             display: 'flex', 
//             alignItems: 'center', 
//             gap: 0.5,
//             px: 1.25,
//             py: 0.5,
//             borderRadius: 1.5,
//             background: `${dueDateInfo.color}12`,
//             border: `1px solid ${dueDateInfo.color}30`
//           }}>
//             <CalendarIcon sx={{ fontSize: 14, color: dueDateInfo.color }} />
//             <Typography 
//               variant="caption" 
//               sx={{ 
//                 color: dueDateInfo.color, 
//                 fontSize: '0.75rem',
//                 fontWeight: 600
//               }}
//             >
//               {dueDateInfo.text}
//             </Typography>
//           </Box>
//         )}

//         {/* Social Stats */}
//         <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
//           {totalLikes > 0 && (
//             <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
//               <FavoriteIcon sx={{ fontSize: 14, color: iconColor }} />
//               <Typography variant="caption" sx={{ color: secondaryTextColor, fontSize: '0.75rem' }}>
//                 {totalLikes}
//               </Typography>
//             </Box>
//           )}
          
//           {commentCount > 0 && (
//             <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
//               <CommentIcon sx={{ fontSize: 14, color: iconColor }} />
//               <Typography variant="caption" sx={{ color: secondaryTextColor, fontSize: '0.75rem' }}>
//                 {commentCount}
//               </Typography>
//             </Box>
//           )}
//         </Box>
//       </Box>

//       {/* Swipe to Start Progress - Only for todo tasks assigned to current user */}
//       {permissions.canStart && onStartProgress && (
//         <Box
//           ref={swipeRef}
//           sx={{
//             mt: 1.5,
//             p: 1,
//             background: isDarkMode 
//               ? 'linear-gradient(90deg, rgba(33, 150, 243, 0.1), rgba(33, 150, 243, 0.05))'
//               : 'linear-gradient(90deg, rgba(33, 150, 243, 0.1), rgba(33, 150, 243, 0.05))',
//             border: `1px dashed ${isDarkMode ? 'rgba(33, 150, 243, 0.3)' : 'rgba(33, 150, 243, 0.4)'}`,
//             borderRadius: 2,
//             cursor: isMobile ? 'default' : 'pointer',
//             transition: 'all 0.3s ease',
//             position: 'relative',
//             overflow: 'hidden',
//             userSelect: 'none',
//             WebkitUserSelect: 'none',
//             touchAction: 'pan-y',
//             '&:hover': !isMobile ? {
//               background: isDarkMode 
//                 ? 'linear-gradient(90deg, rgba(33, 150, 243, 0.2), rgba(33, 150, 243, 0.1))'
//                 : 'linear-gradient(90deg, rgba(33, 150, 243, 0.2), rgba(33, 150, 243, 0.1))',
//               borderColor: isDarkMode ? 'rgba(33, 150, 243, 0.5)' : 'rgba(33, 150, 243, 0.6)',
//               transform: 'translateX(4px)',
//             } : {},
//             '&::before': {
//               content: isMobile ? '"Swipe right to start working  »"' : '"Click to start working  »"',
//               position: 'absolute',
//               top: '50%',
//               left: '50%',
//               transform: 'translate(-50%, -50%)',
//               color: isDarkMode ? 'rgba(33, 150, 243, 0.8)' : 'rgba(33, 150, 243, 0.9)',
//               fontSize: '0.75rem',
//               fontWeight: 500,
//               whiteSpace: 'nowrap',
//               pointerEvents: 'none',
//             },
//             '&:active': !isMobile ? {
//               transform: 'translateX(8px)',
//               background: isDarkMode 
//                 ? 'linear-gradient(90deg, rgba(33, 150, 243, 0.3), rgba(33, 150, 243, 0.2))'
//                 : 'linear-gradient(90deg, rgba(33, 150, 243, 0.3), rgba(33, 150, 243, 0.2))',
//             } : {}
//           }}
//           onTouchStart={handleTouchStart}
//           onTouchMove={handleTouchMove}
//           onTouchEnd={handleTouchEnd}
//           onClick={!isMobile ? () => onStartProgress?.(task.taskId) : undefined}
//         >
//           <Box sx={{ flex: 1, minWidth: 0 }} />
//         </Box>
//       )}

//       {/* Action Buttons */}
//       {(permissions.canSubmit || permissions.canApprove || permissions.canReject || permissions.canUndo) && (
//         <Box 
//           className="action-buttons"
//           sx={{
//             display: 'flex',
//             gap: 1,
//             opacity: 0,
//             transform: 'translateY(8px)',
//             transition: 'all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
//             mt: 2
//           }}
//         >
//           {permissions.canSubmit && onMarkDone && (
//             <Button
//               size="small"
//               onClick={() => onMarkDone?.(task.taskId)}
//               variant="contained"
//               sx={{
//                 borderRadius: 2,
//                 textTransform: 'none',
//                 fontWeight: 600,
//                 px: 2,
//                 py: 0.75,
//                 fontSize: '0.8rem',
//                 letterSpacing: '0.02em',
//                 background: 'linear-gradient(135deg, #34c759 0%, #30d158 100%)',
//                 boxShadow: '0 4px 16px rgba(52, 199, 89, 0.3)',
//                 backdropFilter: 'blur(20px)',
//                 WebkitBackdropFilter: 'blur(20px)',
//                 border: '1px solid rgba(255, 255, 255, 0.3)',
//                 '&:hover': {
//                   background: 'linear-gradient(135deg, #30d158 0%, #2cb84f 100%)',
//                   boxShadow: '0 6px 20px rgba(52, 199, 89, 0.4)',
//                   transform: 'translateY(-2px)',
//                 }
//               }}
//             >
//               Submit
//             </Button>
//           )}
          
//           {permissions.canApprove && onApprove && (
//             <Button
//               size="small"
//               onClick={() => onApprove?.(task.taskId)}
//               variant="contained"
//               sx={{
//                 borderRadius: 2,
//                 textTransform: 'none',
//                 fontWeight: 600,
//                 px: 2,
//                 py: 0.75,
//                 fontSize: '0.8rem',
//                 letterSpacing: '0.02em',
//                 background: 'linear-gradient(135deg, #30d158 0%, #32d74b 100%)',
//                 boxShadow: '0 4px 16px rgba(48, 209, 88, 0.3)',
//                 backdropFilter: 'blur(20px)',
//                 WebkitBackdropFilter: 'blur(20px)',
//                 border: '1px solid rgba(255, 255, 255, 0.3)',
//                 '&:hover': {
//                   background: 'linear-gradient(135deg, #32d74b 0%, #2fc554 100%)',
//                   boxShadow: '0 6px 20px rgba(48, 209, 88, 0.4)',
//                   transform: 'translateY(-2px)',
//                 }
//               }}
//             >
//               Approve
//             </Button>
//           )}
          
//           {permissions.canReject && onReject && (
//             <Button
//               size="small"
//               onClick={() => onReject?.(task.taskId)}
//               variant="contained"
//               sx={{
//                 borderRadius: 2,
//                 textTransform: 'none',
//                 fontWeight: 600,
//                 px: 2,
//                 py: 0.75,
//                 fontSize: '0.8rem',
//                 letterSpacing: '0.02em',
//                 background: 'linear-gradient(135deg, #ff3b30 0%, #ff453a 100%)',
//                 boxShadow: '0 4px 16px rgba(255, 59, 48, 0.3)',
//                 backdropFilter: 'blur(20px)',
//                 WebkitBackdropFilter: 'blur(20px)',
//                 border: '1px solid rgba(255, 255, 255, 0.3)',
//                 '&:hover': {
//                   background: 'linear-gradient(135deg, #ff453a 0%, #ff3f35 100%)',
//                   boxShadow: '0 6px 20px rgba(255, 59, 48, 0.4)',
//                   transform: 'translateY(-2px)',
//                 }
//               }}
//             >
//               Reject
//             </Button>
//           )}
          
//           {permissions.canUndo && onUndo && (
//             <Button
//               size="small"
//               onClick={() => onUndo?.(task.taskId)}
//               variant="contained"
//               sx={{
//                 borderRadius: 2,
//                 textTransform: 'none',
//                 fontWeight: 600,
//                 px: 2,
//                 py: 0.75,
//                 fontSize: '0.8rem',
//                 letterSpacing: '0.02em',
//                 background: 'linear-gradient(135deg, #ff9500 0%, #ff9f0a 100%)',
//                 boxShadow: '0 4px 16px rgba(255, 149, 0, 0.3)',
//                 backdropFilter: 'blur(20px)',
//                 WebkitBackdropFilter: 'blur(20px)',
//                 border: '1px solid rgba(255, 255, 255, 0.3)',
//                 '&:hover': {
//                   background: 'linear-gradient(135deg, #ff9f0a 0%, #ffa514 100%)',
//                   boxShadow: '0 6px 20px rgba(255, 149, 0, 0.4)',
//                   transform: 'translateY(-2px)',
//                 }
//               }}
//             >
//               Undo
//             </Button>
//           )}
//         </Box>
//       )}

//       {/* Menu */}
//       <Menu
//         anchorEl={anchorEl}
//         open={Boolean(anchorEl)}
//         onClose={handleMenuClose}
//         PaperProps={{
//           sx: {
//             background: isDarkMode 
//               ? 'rgba(28, 28, 30, 0.8)' 
//               : 'rgba(255, 255, 255, 0.8)',
//             backdropFilter: 'blur(40px) saturate(180%)',
//             WebkitBackdropFilter: 'blur(40px) saturate(180%)',
//             border: isDarkMode 
//               ? '1px solid rgba(255, 255, 255, 0.15)' 
//               : '1px solid rgba(0, 0, 0, 0.1)',
//             borderRadius: 3,
//             minWidth: 180,
//             boxShadow: isDarkMode 
//               ? '0 8px 32px rgba(0, 0, 0, 0.4)' 
//               : '0 8px 32px rgba(0, 0, 0, 0.15)',
//             mt: 1
//           }
//         }}
//         transformOrigin={{ horizontal: 'right', vertical: 'top' }}
//         anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
//       >
//         <MenuItem
//           onClick={() => {
//             onEdit(task);
//             handleMenuClose();
//           }}
//           disabled={!permissions.canEdit}
//           sx={{
//             color: textColor,
//             fontSize: '0.875rem',
//             fontWeight: 500,
//             py: 1,
//             px: 2,
//             borderRadius: 1.5,
//             mx: 0.5,
//             my: 0.25,
//             '&:hover': {
//               background: isDarkMode 
//                 ? 'rgba(255, 255, 255, 0.1)' 
//                 : 'rgba(0, 0, 0, 0.05)',
//             },
//             '&.Mui-disabled': {
//               opacity: 0.4
//             }
//           }}
//         >
//           <EditIcon sx={{ mr: 1.5, fontSize: 18 }} />
//           Edit
//         </MenuItem>
        
//         {task.status === 'draft' && onUpdateTaskStatus && (
//           <MenuItem
//             onClick={() => {
//               onUpdateTaskStatus?.(task.taskId, 'todo');
//               handleMenuClose();
//             }}
//             disabled={!permissions.canEdit}
//             sx={{
//               color: '#007aff',
//               fontSize: '0.875rem',
//               fontWeight: 500,
//               py: 1,
//               px: 2,
//               borderRadius: 1.5,
//               mx: 0.5,
//               my: 0.25,
//               '&:hover': {
//                 background: isDarkMode 
//                   ? 'rgba(0, 122, 255, 0.15)' 
//                   : 'rgba(0, 122, 255, 0.08)',
//               },
//               '&.Mui-disabled': {
//                 opacity: 0.4
//               }
//             }}
//           >
//             <Typography sx={{ mr: 1.5, fontSize: 18 }}>→</Typography>
//             Move to Todo
//           </MenuItem>
//         )}
        
//         <MenuItem
//           onClick={() => {
//             onCancel?.(task.taskId);
//             handleMenuClose();
//           }}
//           disabled={!permissions.canCancel || !onCancel}
//           sx={{
//             color: '#ff9500',
//             fontSize: '0.875rem',
//             fontWeight: 500,
//             py: 1,
//             px: 2,
//             borderRadius: 1.5,
//             mx: 0.5,
//             my: 0.25,
//             '&:hover': {
//               background: isDarkMode 
//                 ? 'rgba(255, 149, 0, 0.15)' 
//                 : 'rgba(255, 149, 0, 0.08)',
//             },
//             '&.Mui-disabled': {
//               opacity: 0.4
//             }
//           }}
//         >
//           <Typography sx={{ mr: 1.5, fontSize: 18 }}>×</Typography>
//           Cancel Task
//         </MenuItem>
        
//         <MenuItem
//           onClick={() => {
//             onDelete?.(task.taskId);
//             handleMenuClose();
//           }}
//           disabled={!permissions.canDelete}
//           sx={{
//             color: '#ff3b30',
//             fontSize: '0.875rem',
//             fontWeight: 500,
//             py: 1,
//             px: 2,
//             borderRadius: 1.5,
//             mx: 0.5,
//             my: 0.25,
//             '&:hover': {
//               background: isDarkMode 
//                 ? 'rgba(255, 59, 48, 0.15)' 
//                 : 'rgba(255, 59, 48, 0.08)',
//             },
//             '&.Mui-disabled': {
//               opacity: 0.4
//             }
//           }}
//         >
//           <DeleteIcon sx={{ mr: 1.5, fontSize: 18 }} />
//           Delete
//         </MenuItem>
//       </Menu>
//     </Box>
//   );
// };

// const ScheduleTaskCardMemo = ScheduleTaskCard;

// export default React.memo(ScheduleTaskCardMemo);
import React, { useState, useMemo } from 'react';
import {
  Box,
  Typography,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  Button,
  useTheme
} from '@mui/material';
import Swal from 'sweetalert2';
import {
  MoreVert as MoreVertIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  CalendarToday as CalendarIcon,
  Person as PersonIcon,
  Cancel as CancelIcon
} from '@mui/icons-material';
import { parseISO, isPast, isToday } from 'date-fns';
import { Task, TaskLikeSummary } from '../../api/task.api';
import { getTaskPermissions } from '../../permissions/taskPermissions';

interface Props {
  task: Task;
  likeSummary?: TaskLikeSummary;
  currentUserId: number;
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
  onComment?: (taskId: string, comment: string) => void;
  onStartProgress?: (taskId: string) => void;
  onApprove?: (taskId: string) => void;
  onReject?: (taskId: string) => void;
  onCancel?: (taskId: string) => void;
  onUpdateTaskStatus?: (taskId: string, status: Task['status']) => void;
  onMarkDone?: (taskId: string) => void;
  onMarkUndone?: (taskId: string) => void;
  onUndo?: (taskId: string) => void;
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'draft': return '#9e9e9e';
    case 'todo': return '#0A84FF';
    case 'in_progress': return '#FF9F0A';
    case 'done': return '#30D158';
    case 'review': return '#9c27b0';
    case 'cancelled': return '#f44336';
    default: return '#8E8E93';
  }
};

const getDue = (task: Task) => {
  if (!task.dueDate) return null;

  const date = parseISO(task.dueDate);
  const now = new Date();

  if (isPast(date) && !isToday(date)) {
    return { text: 'Overdue', color: '#FF3B30' };
  }
  if (isToday(date)) {
    return { text: 'Today', color: '#FF9F0A' };
  }
  return { text: 'Upcoming', color: '#34C759' };
};

const ScheduleTaskCard: React.FC<Props> = ({
  task,
  likeSummary,
  currentUserId,
  onEdit,
  onDelete,
  onComment,
  onStartProgress,
  onApprove,
  onReject,
  onCancel,
  onUpdateTaskStatus,
  onMarkDone,
  onMarkUndone,
  onUndo
}) => {
  const theme = useTheme();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const isDark = theme.palette.mode === 'dark';

  const permissions = useMemo(() =>
    getTaskPermissions({ userId: currentUserId, task }),
    [currentUserId, task]
  );

  const due = getDue(task);

  return (
    <Box
      sx={{
        p: 3,
        borderRadius: 3,

        // Single glass layer - clean and subtle
        background: isDark
          ? 'rgba(255, 255, 255, 0.06)'
          : 'rgba(255, 255, 255, 0.72)',

        backdropFilter: 'blur(20px) saturate(120%)',
        WebkitBackdropFilter: 'blur(20px) saturate(120%)',
        border: isDark
          ? '1px solid rgba(255, 255, 255, 0.08)'
          : '1px solid rgba(255, 255, 255, 0.5)',

        // Soft depth - iOS style
        boxShadow: isDark
          ? '0 2px 20px rgba(0, 0, 0, 0.3)'
          : '0 2px 20px rgba(0, 0, 0, 0.06)',

        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: isDark
            ? '0 4px 28px rgba(0, 0, 0, 0.4)'
            : '0 4px 28px rgba(0, 0, 0, 0.1)',
        }
      }}
    >
      {/* Header - Title with menu */}
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="flex-start"
        mb={2}
      >
        <Typography
          fontWeight={600}
          fontSize="1.1rem"
          sx={{
            lineHeight: 1.4,
            color: isDark ? '#fff' : '#000',
            flex: 1,
            mr: 2,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden'
          }}
        >
          {task.title}
        </Typography>

        <IconButton
          size="small"
          onClick={(e) => setAnchorEl(e.currentTarget)}
          sx={{
            color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)',
            p: 0.5,
            '&:hover': {
              color: isDark ? '#fff' : '#000',
              background: isDark
                ? 'rgba(255,255,255,0.1)'
                : 'rgba(0,0,0,0.05)',
            }
          }}
        >
          <MoreVertIcon fontSize="small" />
        </IconButton>
      </Box>

      {/* Description - subtle */}
      {task.description && (
        <Typography
          variant="body2"
          sx={{
            opacity: 0.6,
            mb: 2.5,
            lineHeight: 1.5,
            color: isDark ? '#fff' : '#000',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden'
          }}
        >
          {task.description}
        </Typography>
      )}

      {/* Meta chips - minimal and clean */}
      <Box display="flex" gap={1} flexWrap="wrap" mb={2.5}>
        <Chip
          label={task.status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
          size="small"
          sx={{
            background: getStatusColor(task.status),
            color: '#fff',
            fontWeight: 500,
            fontSize: '0.75rem',
            height: 24,
            borderRadius: 1.5,
          }}
        />

        {task.assignedTo && (
          <Chip
            icon={<PersonIcon sx={{ fontSize: 14 }} />}
            label={task.assignedToUser?.userName}
            size="small"
            variant="outlined"
            sx={{
              fontSize: '0.75rem',
              height: 24,
              borderRadius: 1.5,
              borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)',
              color: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)',
              '& .MuiChip-icon': {
                color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)',
              }
            }}
          />
        )}

        {due && (
          <Chip
            icon={<CalendarIcon sx={{ fontSize: 14 }} />}
            label={due.text}
            size="small"
            variant="outlined"
            sx={{
              fontSize: '0.75rem',
              height: 24,
              borderRadius: 1.5,
              borderColor: `${due.color}40`,
              color: due.color,
              '& .MuiChip-icon': {
                color: due.color,
              }
            }}
          />
        )}
      </Box>

      {/* CTA - clean iOS button */}
      {permissions.canStart && onStartProgress && (
        <Button
          fullWidth
          onClick={() => onStartProgress(task.taskId)}
          sx={{
            borderRadius: 2,
            textTransform: 'none',
            fontWeight: 500,
            fontSize: '0.875rem',
            py: 1,

            // iOS system blue style
            background: isDark
              ? 'rgba(10, 132, 255, 0.2)'
              : 'rgba(10, 132, 255, 0.1)',
            color: '#0A84FF',
            border: isDark
              ? '1px solid rgba(10, 132, 255, 0.3)'
              : '1px solid rgba(10, 132, 255, 0.2)',

            '&:hover': {
              background: isDark
                ? 'rgba(10, 132, 255, 0.3)'
                : 'rgba(10, 132, 255, 0.15)',
            }
          }}
        >
          Start Working
        </Button>
      )}

      {/* Submit button for in_progress tasks */}
      {permissions.canSubmit && onMarkDone && (
        <Button
          fullWidth
          onClick={() => onMarkDone(task.taskId)}
          sx={{
            borderRadius: 2,
            textTransform: 'none',
            fontWeight: 500,
            fontSize: '0.875rem',
            py: 1,
            mt: 1.5,

            // iOS green style
            background: isDark
              ? 'rgba(48, 209, 88, 0.2)'
              : 'rgba(48, 209, 88, 0.1)',
            color: '#30D158',
            border: isDark
              ? '1px solid rgba(48, 209, 88, 0.3)'
              : '1px solid rgba(48, 209, 88, 0.2)',

            '&:hover': {
              background: isDark
                ? 'rgba(48, 209, 88, 0.3)'
                : 'rgba(48, 209, 88, 0.15)',
            }
          }}
        >
          Submit for Review
        </Button>
      )}

      {/* Action buttons for review/approve/reject */}
      {(permissions.canApprove || permissions.canReject) && (
        <Box display="flex" gap={1} mt={1.5}>
          {permissions.canApprove && onApprove && (
            <Button
              size="small"
              onClick={() => onApprove(task.taskId)}
              sx={{
                flex: 1,
                borderRadius: 2,
                textTransform: 'none',
                fontWeight: 500,
                fontSize: '0.875rem',
                py: 0.75,

                // iOS green style
                background: isDark
                  ? 'rgba(48, 209, 88, 0.2)'
                  : 'rgba(48, 209, 88, 0.1)',
                color: '#30D158',
                border: isDark
                  ? '1px solid rgba(48, 209, 88, 0.3)'
                  : '1px solid rgba(48, 209, 88, 0.2)',

                '&:hover': {
                  background: isDark
                    ? 'rgba(48, 209, 88, 0.3)'
                    : 'rgba(48, 209, 88, 0.15)',
                }
              }}
            >
              Approve
            </Button>
          )}

          {permissions.canReject && onReject && (
            <Button
              size="small"
              onClick={() => onReject(task.taskId)}
              sx={{
                flex: 1,
                borderRadius: 2,
                textTransform: 'none',
                fontWeight: 500,
                fontSize: '0.875rem',
                py: 0.75,

                // iOS red style
                background: isDark
                  ? 'rgba(255, 59, 48, 0.2)'
                  : 'rgba(255, 59, 48, 0.1)',
                color: '#FF3B30',
                border: isDark
                  ? '1px solid rgba(255, 59, 48, 0.3)'
                  : '1px solid rgba(255, 59, 48, 0.2)',

                '&:hover': {
                  background: isDark
                    ? 'rgba(255, 59, 48, 0.3)'
                    : 'rgba(255, 59, 48, 0.15)',
                }
              }}
            >
              Reject
            </Button>
          )}
        </Box>
      )}

      {/* Menu - clean glass style */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
        PaperProps={{
          sx: {
            background: isDark
              ? 'rgba(30, 30, 30, 0.8)'
              : 'rgba(255, 255, 255, 0.8)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: isDark
              ? '1px solid rgba(255, 255, 255, 0.1)'
              : '1px solid rgba(0, 0, 0, 0.08)',
            borderRadius: 2,
            minWidth: 160,
            boxShadow: isDark
              ? '0 8px 32px rgba(0, 0, 0, 0.4)'
              : '0 8px 32px rgba(0, 0, 0, 0.12)',
          }
        }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <MenuItem
          onClick={() => {
            onEdit(task);
            setAnchorEl(null);
          }}
          disabled={!permissions.canEdit}
          sx={{
            fontSize: '0.875rem',
            color: isDark ? '#fff' : '#000',
            '&:hover': {
              background: isDark
                ? 'rgba(255, 255, 255, 0.08)'
                : 'rgba(0, 0, 0, 0.04)',
            },
            '&.Mui-disabled': {
              opacity: 0.4,
            }
          }}
        >
          <EditIcon fontSize="small" sx={{ mr: 1.5 }} />
          Edit
        </MenuItem>

        {task.status === 'draft' && onUpdateTaskStatus && (
          <MenuItem
            onClick={() => {
              onUpdateTaskStatus(task.taskId, 'todo');
              setAnchorEl(null);
            }}
            disabled={!permissions.canEdit}
            sx={{
              fontSize: '0.875rem',
              color: '#0A84FF',
              '&:hover': {
                background: isDark
                  ? 'rgba(10, 132, 255, 0.1)'
                  : 'rgba(10, 132, 255, 0.08)',
              },
              '&.Mui-disabled': {
                opacity: 0.4,
              }
            }}
          >
            <Typography sx={{ mr: 1.5, fontSize: 16 }}>→</Typography>
            Move to Todo
          </MenuItem>
        )}

        {task.status !== 'cancelled' && onCancel && (
          <MenuItem
            onClick={() => {
              onCancel?.(task.taskId);
              setAnchorEl(null);
            }}
            disabled={!permissions.canCancel}
            sx={{
              fontSize: '0.875rem',
              color: '#FF9500',
              '&:hover': {
                background: isDark
                  ? 'rgba(255, 159, 10, 0.1)'
                  : 'rgba(255, 159, 10, 0.08)',
              },
              '&.Mui-disabled': {
                opacity: 0.4,
              }
            }}
          >
            <CancelIcon fontSize="small" sx={{ mr: 1.5 }} />
            Cancel Task
          </MenuItem>
        )}

        <MenuItem
          onClick={async () => {
            setAnchorEl(null);
            const result = await Swal.fire({
              title: 'Delete Task?',
              text: 'Are you sure you want to delete this task? This action cannot be undone.',
              icon: 'warning',
              showCancelButton: true,
              confirmButtonColor: '#FF3B30',
              cancelButtonColor: '#757575',
              confirmButtonText: 'Yes, delete it!',
              cancelButtonText: 'Cancel',
              reverseButtons: true,
            });

            if (result.isConfirmed) {
              onDelete(task.taskId);
            }
          }}
          disabled={!permissions.canDelete}
          sx={{
            fontSize: '0.875rem',
            color: '#FF3B30',
            '&:hover': {
              background: isDark
                ? 'rgba(255, 59, 48, 0.1)'
                : 'rgba(255, 59, 48, 0.08)',
            },
            '&.Mui-disabled': {
              opacity: 0.4,
            }
          }}
        >
          <DeleteIcon fontSize="small" sx={{ mr: 1.5 }} />
          Delete
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default React.memo(ScheduleTaskCard);
