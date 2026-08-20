import { Alert, ScrollView, Text, View } from 'react-native';
import { Href, Stack, useLocalSearchParams, useRouter } from 'expo-router';

import { ActionBar } from '@/components/ActionBar';
import { Card } from '@/components/FormKit';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { cancelPurchase, getPurchase, money } from '@/lib/erp';
import { askPrint } from '@/lib/exportShare';
import { printHtml, purchasePrintHtml } from '@/lib/print';
import { hasPermission } from '@/lib/permissions';
import { getSession } from '@/lib/rbac';

export default function PurchaseDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const router = useRouter();
  const row = getPurchase(id);
  const canCreate = hasPermission(getSession(), 'purchases.create');

  return (
    <>
      <Stack.Screen options={{ title: row?.invoiceNo ?? 'Purchase' }} />
      <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 40 }}>
        {!row ? (
          <Text style={{ color: colors.muted }}>Purchase not found.</Text>
        ) : (
          <Card title={row.invoiceNo}>
            <Text style={{ color: colors.muted }}>
              {row.invoiceDate} · {row.vendorName} · {row.paymentMode} · {row.status}
            </Text>
            {row.items.map((line) => (
              <View key={line.variantId} style={{ paddingVertical: 8 }}>
                <Text style={{ color: colors.text, fontWeight: '700' }}>{line.productName}</Text>
                <Text style={{ color: colors.muted }}>
                  {[line.size, line.color].filter(Boolean).join(' / ')}
                  {line.size || line.color ? ' · ' : ''}
                  {line.quantity} × {money(line.unitPrice)} = {money(line.lineTotal)}
                </Text>
              </View>
            ))}
            <Text style={{ color: colors.muted }}>Subtotal {money(row.subtotal)}</Text>
            <Text style={{ color: colors.muted }}>Discount {money(row.discountAmount)}</Text>
            <Text style={{ color: colors.muted }}>Additions {money(row.additionAmount)}</Text>
            <Text style={{ color: colors.muted }}>Tax {money(row.taxAmount)}</Text>
            <Text style={{ color: colors.text, fontWeight: '800', fontSize: 18 }}>Total {money(row.grandTotal)}</Text>
            <Text style={{ color: colors.muted }}>Paid {money(row.paidAmount)}</Text>
            <Text style={{ color: colors.muted }}>Balance {money(row.grandTotal - row.paidAmount)}</Text>
            {row.notes ? <Text style={{ color: colors.text }}>{row.notes}</Text> : null}
            <ActionBar
              actions={[
                {
                  label: 'Edit',
                  hidden: !canCreate || row.status !== 'posted',
                  onPress: () => router.push(`/purchase/edit/${row.id}` as Href),
                },
                {
                  label: 'Print',
                  onPress: () => askPrint((size) => void printHtml(purchasePrintHtml(row, size), row.invoiceNo)),
                },
                {
                  label: 'Purchase return',
                  hidden: row.status !== 'posted' || !hasPermission(getSession(), 'purchases.return'),
                  onPress: () => router.push(`/return/purchase/${row.id}` as Href),
                },
                {
                  label: 'Delete',
                  danger: true,
                  hidden: !canCreate || row.status !== 'posted',
                  onPress: () =>
                    Alert.alert('Delete purchase', row.invoiceNo, [
                      { text: 'Cancel', style: 'cancel' },
                      {
                        text: 'Delete',
                        style: 'destructive',
                        onPress: () => void cancelPurchase(row.id).then(() => router.back()),
                      },
                    ]),
                },
              ]}
            />
          </Card>
        )}
      </ScrollView>
    </>
  );
}
