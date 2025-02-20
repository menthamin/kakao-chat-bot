interface Bot {
  id: string;
  name: string;
}

interface Intent {
  id: string;
  name: string;
  extra: {
    reason: {
      code: number;
      message: string;
    };
  };
}

interface Action {
  id: string;
  name: string;
  params: Record<string, any>;
  detailParams: Record<string, any>;
  clientExtra: Record<string, any>;
}

interface UserProperties {
  botUserKey: string;
  isFriend: boolean;
  plusfriendUserKey: string;
  bot_user_key: string;
  plusfriend_user_key: string;
}

interface User {
  id: string;
  type: string;
  properties: UserProperties;
}

interface UserRequest {
  block: {
    id: string;
    name: string;
  };
  user: User;
  utterance: string;
  params: {
    surface: string;
  };
  lang: string;
  timezone: string;
}

interface Flow {
  lastBlock: {
    id: string;
    name: string;
  };
  trigger: {
    type: string;
  };
}

export interface KakaoChatbotEventData {
  bot: Bot;
  intent: Intent;
  action: Action;
  userRequest: UserRequest;
  contexts: any[];
  flow: Flow;
}

export class KakaoChatbotEvent {
  private data: KakaoChatbotEventData;

  constructor(eventData: KakaoChatbotEventData) {
    this.data = eventData;
  }

  // 사용자가 입력한 질문(utterance) 가져오기
  getQuestion(): string {
    return this.data.userRequest.utterance;
  }

  // 사용자 ID 가져오기
  getUserId(): string {
    return this.data.userRequest.user.id;
  }

  // 콜백 URL 가져오기 (예제 - 실제 데이터 구조에 따라 다를 수 있음)
  getCallbackUrl(): string | null {
    return this.data.action.clientExtra?.callbackUrl || null;
  }

  // 전체 데이터 반환 (JSON 변환)
  toJSON(): KakaoChatbotEventData {
    return this.data;
  }
}