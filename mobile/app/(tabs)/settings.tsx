import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../src/stores/auth';
import { colors, spacing, radius, font, shadows } from '../../src/theme';

function SettingsSection({ title, description }: { title: string; description: string }) {
  return (
    <View style={[styles.section, shadows.sm]}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionDesc}>{description}</Text>
    </View>
  );
}

export default function SettingsScreen() {
  const { user, tenant, logout } = useAuthStore();
  const router = useRouter();

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/login');
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      {/* Profile */}
      <View style={[styles.profileCard, shadows.sm]}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {user?.name?.split(' ').map((n) => n[0]).join('') || '?'}
          </Text>
        </View>
        <View style={styles.profileInfo}>
          <Text style={styles.profileName}>{user?.name || 'User'}</Text>
          <Text style={styles.profileEmail}>{user?.email || ''}</Text>
          {tenant && <Text style={styles.profileTenant}>{tenant.name}</Text>}
        </View>
      </View>

      <SettingsSection title="Workspace" description="Manage workspace settings, members, and roles" />
      <SettingsSection title="API Keys" description="Generate and manage API keys for integrations" />
      <SettingsSection title="Notifications" description="Configure push notifications and alerts" />

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} activeOpacity={0.8}>
        <Text style={styles.logoutText}>Sign Out</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.gray[50],
    padding: spacing.lg,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.gray[200],
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.brand[100],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.lg,
  },
  avatarText: {
    fontSize: font.sizes.lg,
    fontWeight: font.weights.bold,
    color: colors.brand[700],
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: font.sizes.md,
    fontWeight: font.weights.semibold,
    color: colors.gray[900],
  },
  profileEmail: {
    fontSize: font.sizes.sm,
    color: colors.gray[500],
    marginTop: 2,
  },
  profileTenant: {
    fontSize: font.sizes.xs,
    color: colors.brand[600],
    marginTop: 2,
  },
  section: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.gray[200],
  },
  sectionTitle: {
    fontSize: font.sizes.md,
    fontWeight: font.weights.semibold,
    color: colors.gray[900],
    marginBottom: spacing.xs,
  },
  sectionDesc: {
    fontSize: font.sizes.sm,
    color: colors.gray[500],
  },
  logoutButton: {
    backgroundColor: colors.red[500],
    borderRadius: radius.md,
    padding: spacing.lg,
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  logoutText: {
    color: colors.white,
    fontSize: font.sizes.md,
    fontWeight: font.weights.semibold,
  },
});
