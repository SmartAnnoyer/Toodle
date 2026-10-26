package app.toodle;

import android.app.ActivityManager;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Intent;
import android.os.Build;
import androidx.core.app.NotificationCompat;
import androidx.core.content.ContextCompat;
import com.capacitorjs.plugins.pushnotifications.PushNotificationsPlugin;
import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;
import java.util.Map;

public class ToodleMessagingService extends FirebaseMessagingService {

    @Override
    public void onMessageReceived(RemoteMessage remoteMessage) {
        Map<String, String> data = remoteMessage.getData();
        if (!inForeground()) present(data);
        PushNotificationsPlugin.sendRemoteMessage(remoteMessage);
    }

    @Override
    public void onNewToken(String token) {
        PushNotificationsPlugin.onNewToken(token);
    }

    private boolean inForeground() {
        ActivityManager.RunningAppProcessInfo state = new ActivityManager.RunningAppProcessInfo();
        ActivityManager.getMyMemoryState(state);
        return state.importance == ActivityManager.RunningAppProcessInfo.IMPORTANCE_FOREGROUND;
    }

    private void present(Map<String, String> data) {
        if (data == null) return;
        String type = data.get("type");
        String tag = data.get("tag");
        if (tag == null || tag.isEmpty()) tag = "note:" + (type == null ? "message" : type);
        NotificationManager manager = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
        if (manager == null) return;
        int id = trayId(tag);
        if ("read".equals(type)) {
            manager.cancel(tag, id);
            return;
        }
        String title = data.get("title");
        String body = data.get("body");
        if (title == null || title.isEmpty()) return;
        String channel = data.get("channelId");
        if (channel == null || channel.isEmpty()) channel = "messages_v2";
        ensureChannel(manager, channel, "messages_v2".equals(channel) ? "Messages" : "Requests");

        Intent open = new Intent(this, MainActivity.class);
        open.setFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        String messageId = data.get("messageId");
        open.putExtra("google.message_id", messageId == null || messageId.isEmpty() ? tag : messageId);
        for (Map.Entry<String, String> entry : data.entrySet()) {
            open.putExtra(entry.getKey(), entry.getValue());
        }
        PendingIntent pending = PendingIntent.getActivity(
            this,
            id,
            open,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        Notification notification = new NotificationCompat.Builder(this, channel)
            .setSmallIcon(R.drawable.ic_stat_toodle)
            .setColor(ContextCompat.getColor(this, R.color.notification_color))
            .setContentTitle(title)
            .setContentText(body == null ? "" : body)
            .setStyle(new NotificationCompat.BigTextStyle().bigText(body == null ? "" : body))
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setCategory(NotificationCompat.CATEGORY_MESSAGE)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setAutoCancel(true)
            .setOnlyAlertOnce(false)
            .setDefaults(NotificationCompat.DEFAULT_ALL)
            .setContentIntent(pending)
            .build();
        manager.notify(tag, id, notification);
    }

    private void ensureChannel(NotificationManager manager, String id, String name) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        if (manager.getNotificationChannel(id) != null) return;
        NotificationChannel channel = new NotificationChannel(id, name, NotificationManager.IMPORTANCE_HIGH);
        channel.enableVibration(true);
        channel.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
        manager.createNotificationChannel(channel);
    }

    private int trayId(String key) {
        int hash = 0;
        for (int index = 0; index < key.length(); index += 1) {
            hash = (hash * 31) + key.charAt(index);
        }
        int positive = hash == Integer.MIN_VALUE ? 0 : Math.abs(hash);
        return (positive % 100000) + 1;
    }
}
