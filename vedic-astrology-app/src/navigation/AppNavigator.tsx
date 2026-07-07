import React, { useEffect, useState } from 'react';
import {
  NavigationContainer,
  useNavigation,
  useRoute,
  RouteProp,
} from '@react-navigation/native';
import {
  createNativeStackNavigator,
  NativeStackNavigationProp,
} from '@react-navigation/native-stack';
import { onAuthStateChanged, User } from 'firebase/auth';
import { View, ActivityIndicator, StyleSheet, Alert } from 'react-native';
import { auth } from '@/services/firebase';
import { AboutUsScreen } from '@/screens/AboutUsScreen';
import { ContactUsScreen } from '@/screens/ContactUsScreen';
import { BookAppointmentScreen } from '@/screens/BookAppointmentScreen';
import { PaymentScreen } from '@/screens/PaymentScreen';
import { MyBookingsScreen } from '@/screens/MyBookingsScreen';
import { RescheduleScreen } from '@/screens/RescheduleScreen';
import { AdminCalendarScreen } from '@/screens/admin/AdminCalendarScreen';
import { colors } from '@/constants/theme';

export type RootStackParamList = {
  AboutUs: undefined;
  ContactUs: undefined;
  BookAppointment: undefined;
  Payment: { bookingId: string; amountPaise: number };
  MyBookings: undefined;
  Reschedule: { bookingId: string };
  AdminCalendar: undefined;
};

type Nav = NativeStackNavigationProp<RootStackParamList>;

const Stack = createNativeStackNavigator<RootStackParamList>();

/** Wires BookAppointmentScreen's callback to real navigation (Payment, or straight to MyBookings if free). */
function BookAppointmentRoute(): React.JSX.Element {
  const navigation = useNavigation<Nav>();
  return (
    <BookAppointmentScreen
      onBookingCreated={(bookingId, amountPaise) => {
        if (amountPaise > 0) {
          navigation.navigate('Payment', { bookingId, amountPaise });
        } else {
          Alert.alert('Booking confirmed', 'No payment required — see you at the consultation!');
          navigation.navigate('MyBookings');
        }
      }}
    />
  );
}

/** Wires PaymentScreen's route params and success/failure callbacks to navigation. */
function PaymentRoute(): React.JSX.Element {
  const navigation = useNavigation<Nav>();
  const route = useRoute<RouteProp<RootStackParamList, 'Payment'>>();
  return (
    <PaymentScreen
      bookingId={route.params.bookingId}
      amountPaise={route.params.amountPaise}
      onPaymentSuccess={() => {
        Alert.alert('Payment successful (demo)', 'Your appointment is confirmed.');
        navigation.navigate('MyBookings');
      }}
      onPaymentFailure={(reason) => {
        Alert.alert('Payment failed', reason);
      }}
    />
  );
}

/** Wires MyBookingsScreen's reschedule action to actual navigation instead of a no-op. */
function MyBookingsRoute({ userId }: { userId: string }): React.JSX.Element {
  const navigation = useNavigation<Nav>();
  return (
    <MyBookingsScreen
      userId={userId}
      onReschedule={(bookingId) => navigation.navigate('Reschedule', { bookingId })}
    />
  );
}

/** Wires RescheduleScreen's route params and completion callback to navigation. */
function RescheduleRoute(): React.JSX.Element {
  const navigation = useNavigation<Nav>();
  const route = useRoute<RouteProp<RootStackParamList, 'Reschedule'>>();
  return (
    <RescheduleScreen
      bookingId={route.params.bookingId}
      onDone={() => navigation.navigate('MyBookings')}
    />
  );
}

/**
 * ADMIN GATING: isAdmin is read from the Firebase Auth custom claim
 * (idTokenResult.claims.admin), set server-side only — never something the
 * client can set on itself. This gate controls navigation/UI visibility;
 * the actual enforcement is server-side in admin.ts's requireAdmin check,
 * so even a modified client build cannot call admin functions successfully.
 */
export function AppNavigator(): React.JSX.Element {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      if (nextUser) {
        void nextUser.getIdTokenResult().then((tokenResult) => {
          setIsAdmin(tokenResult.claims.admin === true);
          setInitializing(false);
        });
      } else {
        setIsAdmin(false);
        setInitializing(false);
      }
    });
    return unsubscribe;
  }, []);

  if (initializing) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator accessibilityLabel="Loading app" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="AboutUs">
        <Stack.Screen name="AboutUs" component={AboutUsScreen} options={{ title: 'About Us' }} />
        <Stack.Screen
          name="ContactUs"
          component={ContactUsScreen}
          options={{ title: 'Contact Us' }}
        />
        <Stack.Screen
          name="BookAppointment"
          component={BookAppointmentRoute}
          options={{ title: 'Book Appointment' }}
        />
        <Stack.Screen name="Payment" component={PaymentRoute} options={{ title: 'Payment' }} />
        {user ? (
          <>
            <Stack.Screen name="MyBookings" options={{ title: 'My Bookings' }}>
              {() => <MyBookingsRoute userId={user.uid} />}
            </Stack.Screen>
            <Stack.Screen
              name="Reschedule"
              component={RescheduleRoute}
              options={{ title: 'Reschedule Appointment' }}
            />
          </>
        ) : null}
        {isAdmin ? (
          <Stack.Screen
            name="AdminCalendar"
            component={AdminCalendarScreen}
            options={{ title: 'Manage Availability' }}
          />
        ) : null}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
});
