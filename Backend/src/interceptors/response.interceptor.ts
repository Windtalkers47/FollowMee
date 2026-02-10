import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { processObjectDates } from '../utils/date.utils';

@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map(data => {
        // Only process if data exists
        if (!data) return data;
        
        // Process the response data to format dates
        return this.processResponse(data);
      })
    );
  }

  private processResponse(data: any): any {
    // If it's an object with data property (common pattern in your responses)
    if (data && typeof data === 'object' && 'data' in data) {
      return {
        ...data,
        data: processObjectDates(data.data)
      };
    }
    
    // Otherwise process the entire response
    return processObjectDates(data);
  }
}
