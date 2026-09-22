import { ApiError, api } from "@/api/client";
import { useAuth } from "@/auth/AuthProvider";
import { Button, Card, ErrorText } from "@/components/ui";
import { colors } from "@/config";
import {
  AGE_CHECK_EXPLAINER,
  MIN_SIGN_UP_AGE,
  UNDER_AGE_MESSAGE,
  ageInYears,
  formatDateOfBirth,
  meetsMinimumAge,
} from "@tiki-acca/shared";
import DateTimePicker, {
  type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { useEffect, useMemo, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";

type DobResponse = { dateOfBirth: string | null };

/** Local (not UTC) `YYYY-MM-DD` — matches what the sign-up screen submits. */
function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Age verification panel on the Account screen: shows the 18+ status held for
 * the signed-in account, and for accounts created before date-of-birth capture
 * collects and verifies it in-app. This is the signed-in view of the same 18+
 * gate applied at sign-up, so the control is findable without registering.
 */
export function AgeVerificationCard() {
  const { token } = useAuth();
  // undefined = still loading, null = no DOB on file yet.
  const [dob, setDob] = useState<string | null | undefined>(undefined);
  const [picked, setPicked] = useState<Date | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [loadFailed, setLoadFailed] = useState(false);

  const maxDate = useMemo(() => new Date(), []);
  const initialPickerDate = useMemo(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - MIN_SIGN_UP_AGE);
    return d;
  }, []);

  useEffect(() => {
    if (!token) return;
    let active = true;
    api<DobResponse>("/api/user/date-of-birth", { token })
      .then((data) => {
        if (active) setDob(data.dateOfBirth);
      })
      .catch(() => {
        if (active) setLoadFailed(true);
      });
    return () => {
      active = false;
    };
  }, [token]);

  function onPickerChange(event: DateTimePickerEvent, selected?: Date) {
    if (Platform.OS === "android") {
      setShowPicker(false);
      if (event.type === "set" && selected) setPicked(selected);
    } else if (selected) {
      setPicked(selected);
    }
  }

  async function confirm() {
    if (!token) return;
    if (!picked) {
      setError("Select your date of birth first.");
      return;
    }
    const value = toISODate(picked);
    // Checked here and again server-side, with the same shared 18+ rule.
    if (!meetsMinimumAge(value)) {
      setError(UNDER_AGE_MESSAGE);
      return;
    }
    setSaving(true);
    setError("");
    try {
      const data = await api<DobResponse>("/api/user/date-of-birth", {
        method: "PATCH",
        token,
        body: JSON.stringify({ dateOfBirth: value }),
      });
      setDob(data.dateOfBirth);
      setShowPicker(false);
    } catch (e) {
      setError(
        e instanceof ApiError ? e.message : "Couldn't save your date of birth."
      );
    } finally {
      setSaving(false);
    }
  }

  const age = dob ? ageInYears(dob) : null;

  return (
    <Card>
      <Text style={styles.cardTitle}>Age verification</Text>

      {loadFailed ? (
        <Text style={styles.hint}>
          Couldn&apos;t load your age verification status. {AGE_CHECK_EXPLAINER}
        </Text>
      ) : dob === undefined ? (
        <Text style={styles.hint}>Checking your age verification status…</Text>
      ) : dob ? (
        <>
          <View style={styles.statusRow}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{MIN_SIGN_UP_AGE}+ verified</Text>
            </View>
          </View>
          <Text style={styles.detail}>
            Date of birth on file: {formatDateOfBirth(dob) ?? dob}
            {age !== null ? ` (age ${age})` : ""}
          </Text>
          <Text style={styles.hint}>
            {AGE_CHECK_EXPLAINER} Your date of birth can&apos;t be changed here —
            contact support if it needs correcting.
          </Text>
        </>
      ) : (
        <>
          <View style={styles.statusRow}>
            <View style={[styles.badge, styles.badgePending]}>
              <Text style={[styles.badgeText, styles.badgeTextPending]}>
                Not verified
              </Text>
            </View>
          </View>
          <Text style={styles.hint}>
            Tiki Acca is {MIN_SIGN_UP_AGE}+ only. Confirm your date of birth to
            verify your age on this account. It is checked on our servers and
            saved once.
          </Text>
          <Pressable
            style={styles.dateField}
            onPress={() => setShowPicker((s) => !s)}
            accessibilityRole="button"
            accessibilityLabel={`Date of birth. You must be ${MIN_SIGN_UP_AGE} or over to use Tiki Acca.`}
          >
            <Text style={picked ? styles.dateValue : styles.datePlaceholder}>
              {picked
                ? (formatDateOfBirth(toISODate(picked)) ?? "")
                : "Tap to select your date of birth"}
            </Text>
          </Pressable>
          {showPicker ? (
            <DateTimePicker
              value={picked ?? initialPickerDate}
              mode="date"
              display={Platform.OS === "ios" ? "inline" : "default"}
              maximumDate={maxDate}
              themeVariant="dark"
              accentColor={colors.accent}
              onChange={onPickerChange}
            />
          ) : null}
          <ErrorText message={error} />
          <Button
            label={saving ? "Saving…" : `Confirm I am ${MIN_SIGN_UP_AGE} or over`}
            loading={saving}
            onPress={() => void confirm()}
          />
        </>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  cardTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 8,
  },
  statusRow: {
    flexDirection: "row",
    marginBottom: 8,
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: colors.accent,
  },
  badgePending: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  badgeText: {
    color: colors.onAccent,
    fontSize: 12,
    fontWeight: "700",
  },
  badgeTextPending: {
    color: colors.muted,
  },
  detail: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "500",
  },
  hint: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 4,
    marginBottom: 8,
  },
  dateField: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 12,
  },
  dateValue: {
    color: colors.text,
    fontSize: 16,
  },
  datePlaceholder: {
    color: colors.muted,
    fontSize: 16,
  },
});
