import axios, { type AxiosRequestConfig, type AxiosResponse } from 'axios';
import * as https from 'https';
import type {
  IHttpClient,
  HttpRequestConfig,
  HttpResponse
} from '../../domain/interfaces.js';

/**
 * Axios HTTP 客户端实现
 */
export class AxiosHttpClientImpl implements IHttpClient {
  async get<T = unknown>(
    url: string,
    config?: HttpRequestConfig
  ): Promise<HttpResponse<T>> {
    const axiosConfig = this.convertConfig(config);
    const response = await axios.get<T>(url, axiosConfig);
    return this.convertResponse(response);
  }

  async post<T = unknown>(
    url: string,
    data?: unknown,
    config?: HttpRequestConfig
  ): Promise<HttpResponse<T>> {
    const axiosConfig = this.convertConfig(config);
    const response = await axios.post<T>(url, data, axiosConfig);
    return this.convertResponse(response);
  }

  async put<T = unknown>(
    url: string,
    data?: unknown,
    config?: HttpRequestConfig
  ): Promise<HttpResponse<T>> {
    const axiosConfig = this.convertConfig(config);
    const response = await axios.put<T>(url, data, axiosConfig);
    return this.convertResponse(response);
  }

  async delete<T = unknown>(
    url: string,
    config?: HttpRequestConfig
  ): Promise<HttpResponse<T>> {
    const axiosConfig = this.convertConfig(config);
    const response = await axios.delete<T>(url, axiosConfig);
    return this.convertResponse(response);
  }

  /**
   * 转换配置格式
   */
  private convertConfig(config?: HttpRequestConfig): AxiosRequestConfig {
    if (!config) {
      return {};
    }

    const axiosConfig: AxiosRequestConfig = {
      headers: config.headers,
      timeout: config.timeout,
      validateStatus: config.validateStatus
    };

    // 如果需要忽略 SSL 证书验证（用于 Apifox API）
    if (config.rejectUnauthorized === false) {
      axiosConfig.httpsAgent = new https.Agent({
        rejectUnauthorized: false
      });
    }

    return axiosConfig;
  }

  /**
   * 转换响应格式
   */
  private convertResponse<T>(response: AxiosResponse<T>): HttpResponse<T> {
    return {
      data: response.data,
      status: response.status,
      statusText: response.statusText,
      headers: response.headers as Record<string, string>
    };
  }
}

