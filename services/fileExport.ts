
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

export const exportFile = async (blob: Blob, filename: string) => {
  // Sanitize filename to remove characters that might cause issues on mobile filesystems
  const sanitizedFilename = filename.replace(/[<>:"/\\|?*]/g, '_');
  
  if (Capacitor.isNativePlatform()) {
    try {
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onloadend = async () => {
        const base64data = reader.result as string;
        // data:application/octet-stream;base64,.....
        const base64Content = base64data.split(',')[1];

        try {
          const result = await Filesystem.writeFile({
            path: sanitizedFilename,
            data: base64Content,
            directory: Directory.Cache, // Utiliser le cache est plus sûr pour les partages temporaires
          });

          await Share.share({
            title: sanitizedFilename,
            url: result.uri,
            dialogTitle: 'حفظ أو مشاركة الملف', // "Enregistrer ou partager le fichier"
          });
        } catch (writeError: any) {
          console.error('Filesystem Write Error:', writeError);
          alert('تعذر حفظ الملف على الهاتف: ' + writeError.message);
        }
      };
    } catch (e: any) {
      console.error('Export Error:', e);
      alert('حدث خطأ أثناء التصدير: ' + e.message);
    }
  } else {
    // Méthode Web standard
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = sanitizedFilename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
};
