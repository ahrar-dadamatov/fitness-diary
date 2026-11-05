import { Alert, Platform } from 'react-native';

// В react-native-web Alert.alert ничего не делает: диалоги не появляются, а их кнопки
// никогда не срабатывают. На вебе показываем системные диалоги браузера.
if (Platform.OS === 'web' && typeof window !== 'undefined') {
  Alert.alert = (title, message, buttons) => {
    const text = [title, message].filter(Boolean).join('\n\n');
    const actions = buttons ?? [];

    if (actions.length < 2) {
      window.alert(text);
      actions[0]?.onPress?.();
      return;
    }

    const cancel = actions.find((button) => button.style === 'cancel');
    const confirm = actions.find((button) => button !== cancel);
    if (window.confirm(text)) {
      confirm?.onPress?.();
    } else {
      cancel?.onPress?.();
    }
  };
}
