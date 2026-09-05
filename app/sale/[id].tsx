import { Alert, ScrollView, Text, View } from 'react-native';
import { Href, Stack, useLocalSearchParams, useRouter } from 'expo-router';

import { ActionBar } from '@/components/ActionBar';
import { Card } from '@/components/FormKit';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { cancelSale, getSale, money } from '@/lib/erp';
import { askPrint } from '@/lib/exportShare';
import { printHtml, salePrintHtml } from '@/lib/print';
import { hasPermission } from '@/lib/permissions';
import { getSession } from '@/lib/rbac';

export default function SaleDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const router = useRouter();
  const sale = getSale(id);
  const canCreate = hasPermission(getSession(), 'sales.create');

  return (
    <>
      <Stack.Screen options={{ title: sale?.invoiceNo ?? 'Sale' }} />
      <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 40 }}>
        {!sale ? (
          <Text style={{ color: colors.muted }}>Sale not found.</Text>
        ) : (
          <Card title={sale.invoiceNo}>
            <Text style={{ color: colors.muted }}>
              {sale.invoiceDate} · {sale.customerName} · {sale.paymentMode} · {sale.status}
            </Text>
            {sale.items.map((line) => (
              <View key={line.variantId} style={{ paddingVertical: 8 }}>
                <Text style={{ color: colors.text, fontWeight: '700' }}>{line.productName}</Text>
                <Text style={{ color: colors.muted }}>
                  {[line.size, line.color].filter(Boolean).join(' / ')}
                  {line.size || line.color ? ' · ' : ''}
                  {line.quantity} × {money(line.unitPrice)} = {money(line.lineTotal)}
                </Text>
              </View>
            ))}
            <Text style={{ color: colors.muted }}>Subtotal {money(sale.subtotal)}</Text>
            <Text style={{ color: colors.muted }}>Discount {money(sale.discountAmount)}</Text>
            <Text style={{ color: colors.muted }}>Additions {money(sale.additionAmount)}</Text>
            <Text style={{ color: colors.muted }}>Tax {money(sale.taxAmount)}</Text>
            <Text style={{ color: colors.text, fontWeight: '800', fontSize: 18 }}>Total {money(sale.grandTotal)}</Text>
            <Text style={{ color: colors.muted }}>Paid {money(sale.paidAmount)}</Text>
            <Text style={{ color: colors.muted }}>Balance {money(sale.grandTotal - sale.paidAmount)}</Text>
            {sale.notes ? <Text style={{ color: colors.text }}>{sale.notes}</Text> : null}
            <ActionBar
              actions={[
                {
                  label: 'Edit',
                  hidden: !canCreate || sale.status !== 'posted',
                  onPress: () => router.push(`/sale/edit/${sale.id}` as Href),
                },
                {
                  label: 'Print',
                  onPress: () =>
                    askPrint((size) => {
                      void printHtml(salePrintHtml(sale, size), sale.invoiceNo).catch((e) =>
                        Alert.alert(e instanceof Error ? e.message : 'Print failed'),
                      );
                    }),
                },
                {
                  label: 'Sale return',
                  hidden: sale.status !== 'posted' || !hasPermission(getSession(), 'sales.return'),
                  onPress: () => router.push(`/return/sale/${sale.id}` as Href),
                },
                {
                  label: 'Delete',
                  danger: true,
                  hidden: !canCreate || sale.status !== 'posted',
                  onPress: () =>
                    Alert.alert('Delete sale', sale.invoiceNo, [
                      { text: 'Cancel', style: 'cancel' },
                      {
                        text: 'Delete',
                        style: 'destructive',
                        onPress: () => void cancelSale(sale.id).then(() => router.back()),
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
