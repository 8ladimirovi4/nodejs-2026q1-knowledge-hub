import { Module } from "@nestjs/common";
import { StorageModule } from "src/storage";
import { ArticleController } from "./article.controller";
import { ArticleService } from "./article.servise";


@Module({
    imports: [StorageModule],
    controllers: [ArticleController],
    providers: [ArticleService],
    exports: [ArticleService],
})
export class ArticleModule {}
