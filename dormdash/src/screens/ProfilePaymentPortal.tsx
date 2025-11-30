import React from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { WebView } from "react-native-webview";
import type { RouteProp } from "@react-navigation/native";
import { Colors } from "../assets/styles";

type MainStackParamList = {
  PaymentPortal: {
    priceCents: number;
    listingTitle: string;
  };
};

type PaymentPortalRouteProp = RouteProp<MainStackParamList, "PaymentPortal">;

type Props = {
  route: PaymentPortalRouteProp;
};

const PaymentPortal: React.FC<Props> = ({ route }) => {
  const { priceCents, listingTitle } = route.params;
  const priceUSD = (priceCents / 100).toFixed(2);

  // Note: Replace 'test' with your actual PayPal client-id for production.
  const PAYPAL_CLIENT_ID =
    "AdmmYj55K7rZv4UulwRKmy0xC-2JF1fo8PYc1PYh_FupkJi1s_SQ_8RZ9Pub02Ju5zwGHaeFTR5zc8Yt";

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <meta http-equiv="X-UA-Compatible" content="IE=edge" />
        <title>PayPal Checkout</title>
    </head>
    <body>
        <div id="paypal-button-container"></div>
        <script src="https://www.paypal.com/sdk/js?client-id=${PAYPAL_CLIENT_ID}&currency=USD"></script>
        <script>
            paypal.Buttons({
                createOrder: function(data, actions) {
                    return actions.order.create({
                        purchase_units: [{
                            description: "${listingTitle.replace(/"/g, '\\"')}",
                            amount: {
                                value: "${priceUSD}"
                            }
                        }]
                    });
                },
                onApprove: function(data, actions) {
                    return actions.order.capture().then(function(details) {
                        // Send a message back to the React Native app
                        window.ReactNativeWebView.postMessage(JSON.stringify({
                            status: 'success',
                            data: details
                        }));
                    });
                },
                onError: function(err) {
                    window.ReactNativeWebView.postMessage(JSON.stringify({
                        status: 'error',
                        data: err
                    }));
                }
            }).render('#paypal-button-container');
        </script>
    </body>
    </html>
  `;

  const handleWebViewMessage = (event: any) => {
    const message = JSON.parse(event.nativeEvent.data);
    if (message.status === "success") {
      alert("Payment Successful! Transaction ID: " + message.data.id);
      // Here you would navigate back or to a success screen
      // navigation.goBack();
    } else {
      alert("Payment Error. Please try again.");
    }
  };

  return (
    <View style={styles.container}>
      <WebView
        source={{ html: htmlContent }}
        onMessage={handleWebViewMessage}
        startInLoadingState={true}
        renderLoading={() => (
          <ActivityIndicator
            style={styles.loading}
            size="large"
            color={Colors.primary_blue}
          />
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loading: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  },
});

export default PaymentPortal;
