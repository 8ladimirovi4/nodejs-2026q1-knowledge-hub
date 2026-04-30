import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export enum GeminiOperation {
  Summarize = 'summarize',
  Translate = 'translate',
  Analyze = 'analyze',
}

@Injectable()
export class GeminiService {
  private readonly apiBaseUrl: string;
  private readonly model: string;
  private readonly apiKey: string;

  constructor(private readonly config: ConfigService) {
    this.apiBaseUrl =
      this.config.get<string>('GEMINI_API_BASE_URL') ??
      'https://generativelanguage.googleapis.com';
    this.model = this.config.get<string>('GEMINI_MODEL') ?? 'gemini-2.5-flash';
    this.apiKey = this.config.get<string>('GEMINI_API_KEY') ?? '';
  }

  async generateContent(options: {
    operation: GeminiOperation;
    userPrompt: string;
  }): Promise<string> {
    void options.userPrompt;
    console.log('========>', options.userPrompt);
    switch (options.operation) {
      case GeminiOperation.Summarize:
        return 'This action summarizes an article';
      case GeminiOperation.Translate:
        return 'This action translates an article';
      case GeminiOperation.Analyze:
        return 'This action analyzes an article';
    }
  }
}
