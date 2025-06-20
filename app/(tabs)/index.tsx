import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useGym } from '@/contexts/GymContext';
import QRCodeDisplay from '@/components/QRCodeDisplay';
import QRCodeScanner from '@/components/QRCodeScanner';
import { generateQRData, formatDateTime } from '@/utils/qrCode';
import { 
  QrCode, 
  Clock, 
  Users, 
  Calendar,
  TrendingUp,
  Wifi,
  WifiOff
} from 'lucide-react-native';

export default function HomeScreen() {
  const { user } = useAuth();
  const { 
    users, 
    attendance, 
    recordAttendance, 
    getAttendanceHistory,
    syncOfflineData,
    refreshData,
    loading 
  } = useGym();
  
  const [showQRCode, setShowQRCode] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [lastSync, setLastSync] = useState<Date | null>(null);

  useEffect(() => {
    // Check online status periodically
    const checkOnlineStatus = async () => {
      try {
        await fetch('https://www.google.com', { method: 'HEAD', mode: 'no-cors' });
        setIsOnline(true);
      } catch {
        setIsOnline(false);
      }
    };

    checkOnlineStatus();
    const interval = setInterval(checkOnlineStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleQRScan = async (data: string) => {
    setShowScanner(false);
    
    try {
      const qrData = JSON.parse(data);
      if (qrData.id && qrData.name) {
        await recordAttendance(qrData.id, 'check-in');
        Alert.alert('تم بنجاح', `تم تسجيل حضور ${qrData.name}`);
      } else {
        Alert.alert('خطأ', 'رمز QR غير صالح');
      }
    } catch (error) {
      Alert.alert('خطأ', 'لا يمكن قراءة رمز QR');
    }
  };

  const handleSyncOfflineData = async () => {
    try {
      await syncOfflineData();
      setLastSync(new Date());
      Alert.alert('تم بنجاح', 'تم مزامنة البيانات');
    } catch (error) {
      Alert.alert('خطأ', 'فشل في مزامنة البيانات');
    }
  };

  const todayAttendance = getAttendanceHistory(undefined, new Date().toISOString().split('T')[0]);
  const myAttendance = user ? getAttendanceHistory(user.id) : [];
  const unsyncedCount = attendance.filter(record => !record.synced).length;

  const isAdmin = user?.role === 'admin';

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={loading} onRefresh={refreshData} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>
          {isAdmin ? 'لوحة الإدارة' : 'أهلاً وسهلاً'}
        </Text>
        <Text style={styles.subtitle}>
          {user?.name} - DADA GYM
        </Text>
        
        {/* Online Status */}
        <View style={styles.statusContainer}>
          {isOnline ? (
            <View style={styles.onlineStatus}>
              <Wifi size={16} color="#34C759" />
              <Text style={styles.onlineText}>متصل</Text>
            </View>
          ) : (
            <View style={styles.offlineStatus}>
              <WifiOff size={16} color="#FF3B30" />
              <Text style={styles.offlineText}>غير متصل</Text>
            </View>
          )}
        </View>
      </View>

      {/* Stats Cards */}
      <View style={styles.statsContainer}>
        {isAdmin ? (
          <>
            <View style={styles.statCard}>
              <Users size={24} color="#007AFF" />
              <Text style={styles.statNumber}>{users.length}</Text>
              <Text style={styles.statLabel}>إجمالي الأعضاء</Text>
            </View>
            <View style={styles.statCard}>
              <Clock size={24} color="#34C759" />
              <Text style={styles.statNumber}>{todayAttendance.length}</Text>
              <Text style={styles.statLabel}>حضور اليوم</Text>
            </View>
          </>
        ) : (
          <>
            <View style={styles.statCard}>
              <TrendingUp size={24} color="#007AFF" />
              <Text style={styles.statNumber}>{myAttendance.length}</Text>
              <Text style={styles.statLabel}>مجموع حضوري</Text>
            </View>
            <View style={styles.statCard}>
              <Calendar size={24} color="#34C759" />
              <Text style={styles.statNumber}>
                {myAttendance.filter(a => a.date === new Date().toISOString().split('T')[0]).length}
              </Text>
              <Text style={styles.statLabel}>حضور اليوم</Text>
            </View>
          </>
        )}
      </View>

      {/* Offline Sync Warning */}
      {unsyncedCount > 0 && (
        <View style={styles.syncWarning}>
          <Text style={styles.syncWarningText}>
            {unsyncedCount} سجل غير مزامن محلياً
          </Text>
          <TouchableOpacity
            style={styles.syncButton}
            onPress={handleSyncOfflineData}
            disabled={!isOnline}
          >
            <Text style={styles.syncButtonText}>مزامنة</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Quick Actions */}
      <View style={styles.actionsContainer}>
        <Text style={styles.sectionTitle}>الإجراءات السريعة</Text>
        
        {isAdmin ? (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => setShowScanner(true)}
          >
            <QrCode size={24} color="#007AFF" />
            <Text style={styles.actionButtonText}>مسح QR للحضور</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => setShowQRCode(true)}
          >
            <QrCode size={24} color="#007AFF" />
            <Text style={styles.actionButtonText}>عرض رمز QR الخاص بي</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Recent Activity */}
      <View style={styles.activityContainer}>
        <Text style={styles.sectionTitle}>النشاط الأخير</Text>
        {(isAdmin ? todayAttendance : myAttendance)
          .slice(0, 5)
          .map((record, index) => (
            <View key={record.id} style={styles.activityItem}>
              <View style={styles.activityIcon}>
                <Clock size={16} color="#8E8E93" />
              </View>
              <View style={styles.activityContent}>
                <Text style={styles.activityText}>
                  {isAdmin 
                    ? `${users.find(u => u.id === record.userId)?.name || 'مجهول'} - ${record.type === 'check-in' ? 'دخول' : 'خروج'}`
                    : `${record.type === 'check-in' ? 'تسجيل دخول' : 'تسجيل خروج'}`
                  }
                </Text>
                <Text style={styles.activityTime}>
                  {formatDateTime(new Date(`${record.date} ${record.time}`))}
                </Text>
              </View>
              {!record.synced && (
                <View style={styles.unsyncedBadge}>
                  <Text style={styles.unsyncedText}>محلي</Text>
                </View>
              )}
            </View>
          ))}
      </View>

      {/* QR Code Modal */}
      {showQRCode && user && (
        <View style={styles.modal}>
          <View style={styles.modalContent}>
            <QRCodeDisplay
              value={generateQRData(user)}
              title="رمز QR الخاص بي"
              size={200}
            />
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowQRCode(false)}
            >
              <Text style={styles.closeButtonText}>إغلاق</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* QR Scanner */}
      <QRCodeScanner
        isVisible={showScanner}
        onScan={handleQRScan}
        onClose={() => setShowScanner(false)}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    backgroundColor: '#007AFF',
    padding: 20,
    paddingTop: 60,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#FFFFFF',
    textAlign: 'center',
    marginTop: 4,
    opacity: 0.9,
  },
  statusContainer: {
    alignItems: 'center',
    marginTop: 12,
  },
  onlineStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  offlineStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 59, 48, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  onlineText: {
    color: '#FFFFFF',
    fontSize: 12,
    marginLeft: 6,
    fontWeight: '600',
  },
  offlineText: {
    color: '#FFFFFF',
    fontSize: 12,
    marginLeft: 6,
    fontWeight: '600',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    margin: 20,
    marginTop: -30,
  },
  statCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#8E8E93',
    textAlign: 'center',
    marginTop: 4,
  },
  syncWarning: {
    backgroundColor: '#FF9500',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    margin: 20,
    padding: 16,
    borderRadius: 12,
  },
  syncWarningText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  syncButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  syncButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  actionsContainer: {
    margin: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#000',
  },
  actionButton: {
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
    marginLeft: 12,
  },
  activityContainer: {
    margin: 20,
    marginTop: 0,
  },
  activityItem: {
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  activityIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  activityTime: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 2,
  },
  unsyncedBadge: {
    backgroundColor: '#FF9500',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  unsyncedText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
  modal: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    margin: 20,
    alignItems: 'center',
  },
  closeButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 20,
  },
  closeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});