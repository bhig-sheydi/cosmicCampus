import React from 'react';
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogHeader, 
  AlertDialogFooter, 
  AlertDialogTrigger, 
  AlertDialogTitle 
} from '@/components/ui/alert-dialog';

const ConfirmationDialog = ({
  triggerText = 'Open', 
  title = 'Are you absolutely sure?', 
  description = 'This action cannot be undone. This will permanently delete your account and remove your data from our servers.', 
  cancelText = 'Cancel', 
  actionText = 'Continue', 
  imageUrl, 
  imageAlt = 'Confirmation image', 
  Icon, // Accepts a Lucide icon component
  onCancel, 
  onAction 
}) => {
  return (
    <AlertDialog>
      <AlertDialogTrigger>{triggerText}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          {(imageUrl || Icon) && (
            <div style={{
              display: 'flex',  
              alignItems: 'center', 
              justifyContent: 'center',
              backgroundColor: 'rgba(0, 0, 0, 0.1)', // Apply a light background color
              padding: '1rem',
              borderRadius: '8px'
            }}>
              {imageUrl && (
                <img 
                  src={imageUrl} 
                  alt={imageAlt} 
                  style={{ 
                    width: '10%', 
                    height: 'auto', 
                    marginBottom: '1rem' 
                  }} 
                />
              )}
              {Icon && (
                <Icon 
                  size={32} // Set the size of the icon
                  style={{ marginBottom: '1rem' }} 
                />
              )}
            </div>
          )}
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>{cancelText}</AlertDialogCancel>
          <AlertDialogAction onClick={onAction}>{actionText}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default ConfirmationDialog;
